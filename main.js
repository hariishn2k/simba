class ValidationError extends Error {
	constructor (message) {
		super(message);
		this.name = 'ValidationError';
	}
}

const f = (val) => Math.fround(val);

const arg = require('arg');
const Discord = require('discord.js');
const client = new Discord.Client();

let document;
const {JSDOM}  = require('jsdom');
const https = require('https');

const nicknames = require('./nicknames.json');
const config = process.env;
const prefix = '!';
const servants = require('./nice_servant_jp.json');
const NAServants = require('./nice_servant.json');
const classList = require('./class-attack-rate.json');
const classRelation = require('./class-relation.json');
const attributeRelation = require('./attribute-relation.json');
const passiveSkillSet = require('./skills-passive.json');
const maxNAServant = Math.max.apply(null, Object.keys(passiveSkillSet).filter(x => NAServants[x]), NAServants.map(s => s.collectionNo));

let emojis;
client.on('ready', () => {

	console.info(`Logged in as ${client.user.tag}!`);
	emojis = client.guilds.cache.get(`814828096074547240`).emojis.cache;

});

client.on('message', async function (message) {

	if (message.author.bot) return;

	if (!message.content.startsWith(prefix)) return;

	let commandBody = message.content.slice(prefix.length), reply, command, restArgs;

	if (commandBody.length == 0) return;

	[command, ...restArgs] = commandBody.toLowerCase().split(/\s+/);
	command = command.toLowerCase();

	if (command === 'test') {

		let argStr, servant;

		try {
			[servant, argStr] = restArgs;

			if (servant == undefined) {

				reply = `** **	__Argument List:__
		**atkmod/a/atk**:  atk up and down (put - in front of the down value)
		**npmod/n**: np dmg up and down
		**nplevel/np**: (defaults to np5)
		**npgain/npgen/ng**: np generation up
		**level/lvl/l**: level of servant (defaults to the servants max level)
		**cardmod/cm/m**: quick/arts/buster performance up and down
		**str**: used to see np strengh (1 for str, 0 for not; defaults to NA availability)
		**ce/c**: ce attack stat (defaults to 0)
		**fou/f**: fou attack stat (defaults to 1k attack fou)
		**cardvalue/cmv**: to manually change the card type of a NP (only relevant for Astarte to give her np quick dmg value)
		**npvalue/npv**: to manually input np scaling (relevant to put astarte's np as quick)
		**defmod/d**: defense up and down
		**flatdamage/fd**: flat dmg up (waver s3, Saberlot OC)
		**semod/se**: overcharge np dmg increase (for Gilgamesh its 150 at oc1)
		**pmod/p**: powermod vs specific traits (Jack OC, Raiko s3)
		**specialdefensemod/sdm**: special defense up and down (Gawain's damage reduction in Camelot, for example)
		**#**: note/comment - anything that follows this will be ignored
		**/\\\*...\\\*/**: anything between these will be ignored (can be used inline)`;

			}
			else {

				let matches;

				restArgs = restArgs.slice(1).join(' ').split('#')[0].replace(/\/\*[\s\S]*?(\*\/)/g, '');

				if ((matches = restArgs.match(/([bqa]|(np)){3}/g)) != null)
					restArgs = restArgs.replace(/\s+([bqa]|(np)){3}/g, '');

				argStr = restArgs.replace(/\|/g, '').replace(/([A-z])(-?\d)/g, '$1=$2').replace(/([a-z]+)/gi, '--$1');
				servantId = (+servant === +servant) ? +servant : Object.keys(nicknames).find(id => nicknames[id].includes(servant));

				if (typeof servantId === 'undefined') reply = `No match found for ${servant}`;
				else if (matches != null) reply = await chain(servantId, argStr.toLowerCase(), servant, matches[0]);
				else reply = await test(servantId, argStr.toLowerCase(), servant);

			}

		}
		catch (err) {
			console.log(err);
			reply = err;
		}
	}
	else if (command === 'cards') {
		reply = `** **	__Argument List:__
		**critdamage**: critdamage buffs
		**arts/buster/quick**: the calculation will give out the values for an arts/buster/quick card (overrides np calculation)
		**critical/crit**: use for when your face card crits
		**busterfirst/bf**: first card buster bonus
		**artsfirst/af**: first card arts bonus
		**first/second/third**: position of your face card in a chain
		**extracardmodifier/ecm**: used for the extra attack (2 for normal brave chain, 3,5 for QQQ/AAA/BBB)
		**bc/busterchainmod**: buster brave chain dmg bonus`;
	}
	else if (command === 'getnames') {
		servant = restArgs[0];

		if (+servant === +servant) {
			reply = (nicknames[servant].length > 0) ? nicknames[servant] : `No matches found for ${servant}`;
		}
		else {
			id = Object.keys(nicknames).find(id => nicknames[id].includes(servant));
			names = nicknames[id];

			if (names) {
				reply = `**Nicknames for ${servant} (ID #${id})**:\n${JSON.stringify(names)}`;
			}
			else {
				reply = `No matches found for ${servant}`;
			}
		}
	}
	else if (command === 'addname') {
		if (message.author.id === '677587347075760165' || message.author.id === '406537966161362955' || message.author.id === '200914311202209793') {

			[id, nickname] = restArgs;
			console.log(id, nickname, id in nicknames);

			if (id in nicknames) {
				if (!nicknames[id].includes(nickname)) {
					nicknames[id].push(nickname);
					reply = `Set ${id}: ${nickname}`;
					require('fs').writeFileSync('./nicknames.json', JSON.stringify(nicknames, null, 2));
				}
			}
		}
	}
	else if (command === 'starz') {
		reply = '<https://fategrandorder.fandom.com/wiki/Wolfgang_Amadeus_Mozart>';
	}
	else if (command === 'math') {
		reply = `${calculate(parseCalculationString(restArgs.join('')))}`;
	}
	else if (command === 'refund') {
		reply = `https://discord.gg/TKJmuCR`;
	}
	else if (command === 'wikia') {
		reply = await wikia(restArgs.join(' '));
	}
	else if (command === 'google') {
		reply = await bing(restArgs.join(' '));
	}

	if (reply) {

		if (Array.isArray(reply)) {

			for (let i = 0; i < reply.length; i++)
				message.channel.send(reply[i]);

		}
		else {
			message.channel.send(reply);
		}
	}
});

async function test (servantId, argStr, servantName) {

	let args, warnMessage = '';

	try {
	args = arg({

		//Variables
		'--atkmod'		:	[Number],
		'--npmod'		:	[Number],
		'--nplevel'		:	Number,
		'--npvalue'		:	Number,
		'--level'		:	Number,
		'--cardmod'		:	[Number],
		'--str'			:	Number,
		'--ce'			:	Number,
		'--fou'			:	Number,
		'--cardvalue'		:	Number,
		'--npval'		:	Number,
		'--npgen'		:	[Number],
		'--defmod'		:	[Number],
		'--flatdamage'		:	[Number],
		'--semod'		:	[Number],
		'--pmod'		:	[Number],
		'--specialdefensemod'	:	[Number],
		'--critdamage'		:	[Number],
		'--arts'		:	Boolean,
		'--quick'		:	Boolean,
		'--buster'		:	Boolean,
		'--critical'		:	Boolean,
		'--busterfirst'		:	Boolean,
		'--artsfirst'		:	Boolean,
		'--quickfirst'		:	Boolean,
		'--first'		:	Boolean,
		'--second'		:	Boolean,
		'--third'		:	Boolean,
		'--extra'		:	Boolean,
		'--extracardmodifier'	:	Number,
		'--enemyservermod'	:	Number,
		'--serverrate'		:	Number,
		'--stargen'		:	Number,
		//'--stars'		:	Boolean,
		'--cardrefundvalue'	:	Number,
		'--enemyhp'		:	Number,
		'--bc'			:	Boolean,
		'--brave'		:	Boolean,
		'--verbose'		:	Boolean,

		//Aliases
		'--v'			:	'--verbose',
		'--a'			:	'--atkmod',
		'--atk'			:	'--atkmod',
		'--n'			:	'--npmod',
		'--np'			:	'--nplevel',
		'--npv'			:	'--npvalue',
		'--npval'		:	'--npvalue',
		'--lvl'			:	'--level',
		'--l'			:	'--level',
		'--npgain'		:	'--npgen',
		'--ng'			:	'--npgen',
		'--sg'			:	'--stargen',
		'--m'			:	'--cardmod',
		'--hp'			:	'--enemyhp',
		'--c'			:	'--ce',
		'--cm'			:	'--cardmod',
		'--f'			:	'--fou',
		'--cmv'			:	'--cardvalue',
		'--npv'			:	'--npvalue',
		'--d'			:	'--defmod',
		'--def'			:	'--defmod',
		'--fd'			:	'--flatdamage',
		'--se'			:	'--semod',
		'--p'			:	'--pmod',
		'--sdm'			:	'--specialdefensemod',
		'--crit'		:	'--critical',
		'--bf'			:	'--busterfirst',
		'--busterchainmod'	:	'--bc',
		'--crv'			:	'--cardrefundvalue',
		'--af'			:	'--artsfirst',
		'--qf'			:	'--artsfirst',
		'--sm'			:	'--enemyservermod',
		'--esm'			:	'--enemyservermod',
		'--sm'			:	'--enemyservermod',
		'--srr'			:	'--serverrate',
		'--ecm'			:	'--extracardmodifier',
		'--man'			:	'--human',
		'--cd'			:	'--critdamage',

		//Enemy classes
		'--saber'		:	Boolean,
		'--archer'		:	Boolean,
		'--lancer'		:	Boolean,
		'--rider'		:	Boolean,
		'--caster'		:	Boolean,
		'--assassin'		:	Boolean,
		'--berserker'		:	Boolean,
		'--shielder'		:	Boolean,
		'--ruler'		:	Boolean,
		'--alterego'		:	Boolean,
		'--avenger'		:	Boolean,
		'--demongodpillar'	:	Boolean,
		'--beastii'		:	Boolean,
		'--beasti'		:	Boolean,
		'--mooncancer'		:	Boolean,
		'--beastiiir'		:	Boolean,
		'--beastiiil'		:	Boolean,
		'--foreigner'		:	Boolean,
		'--beastunknown'	:	Boolean,

		//Enemy attributes
		'--human'		:	Boolean,
		'--sky'			:	Boolean,
		'--earth'		:	Boolean,
		'--star'		:	Boolean,
		'--beast'		:	Boolean

	}, {
		argv: argStr.split(/\s+/g),
		permissive: true
	});} catch(err) {
		if (err.code === 'ARG_UNKNOWN_OPTION') warnMessage +=  err.message.split('--').join('') + '\n';
		else return `${err}`.replace(/--/g, '');
	}

	if (args._.length > 0 && args._.indexOf('') !== 0) warnMessage = `Unrecognised option: ${args['_'][0]}!\n`;

	for (const key of Object.keys(args)) {
		if (key !== '_') {
			Object.defineProperty(args, key.substring(2), Object.getOwnPropertyDescriptor(args, key));
		}
		delete args[key];
	}

	let servant;

	for (const key of Object.keys(servants)) {

		if (servants[key].collectionNo !== parseInt(servantId)) continue;
		else if (!('noblePhantasms' in servants[key])) continue;
		else servant = servants[key];

		if (args.npLevel > 4) {
			warnMessage += 'NP Level cannot be greater than 5. Setting NP level to 5.\n';
			args.npLevel = 4;
		}

		if (args.fou < 0 || args.fou > 2000) {
			warnMessage += 'Fou value cannot be lesser than 0 or greater than 2000. Setting Fou value to 1000.\n';
			args.fou = 1000;
		}

		if (args.level < 1) {
			warnMessage += 'Servant level cannot be lesser than 0. Setting Servant level to max (ungrailed).\n';
			args.level = 0;
		}

		let nps = Object.keys(servant.noblePhantasms), np, cardType;

		if (parseInt(servantId) <= parseInt(maxNAServant)) {

			nps = Object.keys(NAServants[Object.keys(NAServants).find(x => ((NAServants[x].collectionNo === parseInt(servantId)) && ('noblePhantasms' in NAServants[x])))].noblePhantasms);
			servantName = NAServants[Object.keys(NAServants).find(x=>NAServants[x].collectionNo === parseInt(servantId))].name;

		}

		servantName = servantName[0].toUpperCase() + servantName.slice(1);

		np = nps[nps.length - 1];

		nps = Object.keys(servants[Object.keys(servants).find(x => ((servants[x].collectionNo === parseInt(servantId)) && 'noblePhantasms' in servants[x]))].noblePhantasms);

		if (parseInt(servantId) === 268) np = nps[0];

		if (args.str != null) {
			if (args.str > 0) np = nps[nps.length - 1];
			else np = nps[0];
		}

		switch (servant.noblePhantasms[np].card) {
			case "buster": cardType = 1.5; break;
			case "arts:": cardType = 1; break;
			case "quick": cardType = 0.8; break;
			default: cardType = 1;
		}



		let enemyClass = '', enemyAttribute = '';

		for (const element of Object.keys(classList)) {
			if (args[element.toLowerCase()]) {
				enemyClass = element;
			}
		}

		for (const attrib of Object.keys(attributeRelation)) {
			if (args[attrib.toLowerCase()]) {
				enemyAttribute = attrib;
			}
		}

		enemyClass = enemyClass || 'shielder';
		enemyAttribute = enemyAttribute || servant.attribute;

		let servantClassRate = f(classList[servant.className]/f(1000));
		let atk = (args.level ? servant.atkGrowth[args.level - 1] : servant.atkMax) + (args.fou ?? 1000) + (args.ce ?? 0);
		let advantage = f(classRelation[servant.className][enemyClass]/f(1000));
		let cardMod = f(args.cardmod?.reduce((acc, val) => acc + val) ?? 0)/f(100);
		let critDamage = f(args.critdamage?.reduce((acc, val) => acc + val) ?? 0)/f(100);
		let npLevel = (args.nplevel ?? 5) - 1;
		let atkMod = f(args.atkmod?.reduce((acc, val) => acc + val) ?? 0)/f(100);
		let defMod = f(args.defmod?.reduce((acc, val) => acc + val) ?? 0)/f(100);
		let specialDefMod = f(args.specialdefensemod?.reduce((acc, val) => acc + val) ?? 0)/f(100);
		let npMod = f(args.npmod?.reduce((acc, val) => acc + val) ?? 0)/f(100);
		let attributeAdvantage = attributeRelation[servant.attribute][enemyAttribute]/f(1000);
		let npMulti = 0;
		let npFns = servant.noblePhantasms[np].functions;

		if (servant.collectionNo === 1) {

			atk = (args.level ? servant.atkGrowth[args.level - 1] : servant.atkGrowth[79]) + (args.fou ?? 1000) + (args.ce ?? 0);

		}

		if (npLevel > 4) {

			warnMessage += "NP Level cannot be greater than 5, setting to 5 (default).\n";
			npLevel = 4;

		} else if (npLevel < 0) {

			warnMessage += "NP Level cannot be lesser than 1, setting to 1.\n";
			npLevel = 0;

		}

		for (const npFn in npFns) {
			if (npFns[npFn].funcType.includes('damageNp')) {
				npMulti = f(npFns[npFn].svals[npLevel].Value)/f(10);
				break;
			}
		}

		npMulti = f(args.npvalue ?? npMulti)/f(100);

		let faceCard = (args.extra || args.buster || args.arts || args.quick) ? true : false;
		let extraCardModifier = 1;
		let busterChainMod = (args.bc ? (0.2 * atk) : 0);
		let firstCardBonus = 0;

		if (npMulti === 0 && !faceCard)
			return {
				embed: {
					title: `**${servantName}** NP does not deal damage!`,
					description: '0 (0 to 0)'
				}
			};

		if (args.defmod) {

			if (defMod < -1) {

				warnMessage += 'Defense (de)buffs cannot exceed the range [-100%, 100%]!\n';
				defMod = -1;

			}
			else if (defMod > 1) {


				warnMessage += 'Defense (de)buffs cannot exceed the range [-100%, 100%]!\n';
				defMod = 1;

			}
		}

		let passiveSkills = passiveSkillSet[servantId];
		let flatDamage = f(args.flatdamage?.reduce((acc, val) => acc + val) ?? 0);
		let starGen =  f(args.stargen?.reduce((acc, val) => acc + val) ?? 0);
		let npGen = f(args.npgen?.reduce((acc, val) => acc + val) ?? 0)/f(100);
		let seMod = f(((args.semod?.reduce((acc, val) => acc + val)) ?? 100) - 100)/f(100);
		let pMod = (args.pmod?.reduce((acc, val) => acc + val) ?? 0)/f(100);
		let hits;

		if (enemyClass === 'ruler' && servantId === '167') {
			pMod += 0.5;
		}
		if (args.buster) {cardType = 1.5; hits = servant.hitsDistribution['buster'];}
		else if (args.arts) {cardType = 1; hits = servant.hitsDistribution['arts'];}
		else if (args.quick) {cardType = 0.8; hits = servant.hitsDistribution['quick'];}
		else if (args.extra) {cardType = 1; hits = servant.hitsDistribution['extra'];}
		else hits = servant.noblePhantasms[np].npDistribution;

		let isCrit = ((faceCard && args.critical) && !args.extra) ? true : false;
		let total = 0;
		let cardValue = cardType;

		if (typeof args.cardvalue !== 'undefined') {
			cardValue = parseFloat(args.cardvalue);
		}
		else {
			cardValue = (args.npvalue != null) ? cardType : cardValue;
		}
		if (faceCard) {
			if ((args.bc && !args.extra) || args.buster || (busterChainMod && !args.extra)) {
				cardValue = 1.5;
			}
			if (args.second) {
				cardValue += (cardType * 0.2);
			}
			if (args.third) {
				cardValue += (cardType * 0.4);
			}
		}

		if (args.buster && !(args.second || args.third)) firstCardBonus = 0.5;

		if (args.extra) {faceCard = true; extraCardModifier = 2;}

		if ((args.bc || args.busterfirst) && faceCard) {
			firstCardBonus = 0.5;

			if (args.bc && args.extra) extraCardModifier = 3.5;
		}

		extraCardModifier = args.extracardmodifier ?? extraCardModifier;
		firstCardBonus = faceCard ? firstCardBonus : 0;
		npMulti = faceCard ? 1 : npMulti;

		if (args.quick || (servant.noblePhantasms[np].card === 'quick' && !faceCard)) {
			critDamage += f(parseFloat(passiveSkills.critdamage?.quick ?? 0))/f(100);
			cardMod +=  f(parseFloat(passiveSkills.cardmod?.quick ?? 0))/f(100);
		}
		else if (args.arts || (servant.noblePhantasms[np].card === 'arts' && !faceCard)) {
			critDamage += f(parseFloat(passiveSkills.critdamage?.arts ?? 0))/f(100);
			cardMod += f(parseFloat(passiveSkills.cardmod?.arts ?? 0))/f(100);
		}
		else if (args.buster || (servant.noblePhantasms[np].card === 'buster' && !faceCard)) {
			critDamage += f(parseFloat(passiveSkills.critdamage?.buster ?? 0))/f(100);
			cardMod += f(parseFloat(passiveSkills.cardmod?.buster ?? 0))/f(100);
		}

		flatDamage += f(parseFloat(passiveSkills.flatdamage?.value ?? 0));
		npGen += f(parseFloat(passiveSkills.npgen?.value ?? 0))/f(100);
		starGen += f(parseFloat(passiveSkills.stargen?.value ?? 0))/f(100);
		npMod += f(parseFloat(passiveSkills.npmod?.value ?? 0))/f(100);

		if (isCrit && faceCard) pMod += critDamage;

		if (critDamage > 5) {
			warnMessage += 'Critdamage buffs cannot go above 500%, setting to 500%\n';
			pMod -= (critDamage - 5);
		}

		let val = 0;
		let fD = f(flatDamage);
		let npGainEmbed = null;
		let starGenEmbed = null;

		if (faceCard) fD += f((args.extra ? 0 : 1) * atk * (args.bc ? 0.2 : 0));

		val = f(atk) * f(servantClassRate) * f(advantage) * f(firstCardBonus + f(cardValue) * f(Math.max(f(1 + (args.extra ? 0 : cardMod)), 0))) * f(attributeAdvantage) * f(0.23) * f(npMulti) * (1 + (+isCrit))
			* f(extraCardModifier) * f(Math.max(f(1 + atkMod - defMod), 0)) * f(Math.max(f(1 - specialDefMod), 0)) * f(Math.max(f(1 + pMod + (npMod * +(!faceCard))), 0.001)) * f(1 + seMod * +(!faceCard)) + fD;

		if (args.arts) faceCard = 'Arts';
		else if (args.quick) faceCard = 'Quick';
		else if (args.extra) faceCard = 'Extra';
		else if (args.buster) faceCard = 'Buster';
		else faceCard = 'NP';

		minrollTotalVal = 0.9 * (val - fD) + fD;

		for (const hit of hits.slice(0, hits.length - 1)) {

			total += val * f(f(hit)/f(100)); //add until second-to-last, then add the difference
		}

		total += (val - total);
		total = Math.floor(total);

		if ((args.stars != null) && (args.enemyhp != null)) {

			let enemyHp = args.enemyhp, maxrollEnemyHp = enemyHp, isMaxOverkill = 0, isOverkill = 0, serverRate = (args.serverrate ?? 0), totalDropChance = 0, totalMaxDropChance = 0;
			let overkillNo = 0, maxOverkillNo = 0, minrollTotalVal = 0.9 * f(total - fD) + fD, maxrollTotalVal = 1.099 * f(total - fD) + fD;

			let cardStarValue = (args.quick || (servant.noblePhantasms[np].card === 'quick')) ? 0.8 : 0;
			cardStarValue = (args.buster || servant.noblePhantasms[np].card === 'buster') ? 0.1 : cardStarValue;
			if (args.second && faceCard) cardStarValue += 0.05 * (args.quick ? 10 : 1);
			else if (args.third && faceCard) cardStarValue += 0.05 * (args.quick ? 20 : 2);

			for (let i = 0; i < hits.length; i++) {

				let hit = hits[i], thisHitMinDamage = f(minrollTotalVal * f(hit) / f(100)), thisHitMaxDamage = Math.floor(f(maxrollTotalVal * f(hit) / f(100)));

				enemyHp -= thisHitMinDamage;
				maxrollEnemyHp -= thisHitMaxDamage;
				isOverkill = +(thisHitMinDamage > (0.5 * enemyHp));
				isMaxOverkill = +(thisHitMaxDamage > (0.5 * maxrollEnemyHp));
				overkillNo += isOverkill;
				maxOverkillNo += isMaxOverkill;

				totalDropChance += Math.min(f(f(servant.starGen/1000) + f((args.quickfirst &&  (faceCard !== 'NP')) ? 0.2 : 0) + f(cardStarValue * f(1 + cardMod)) + f(serverRate) + f(starGen) + f(0.2 * +(isCrit)) + f(0.3 * +(isOverkill))), 3);
				totalMaxDropChance += Math.min(f(f(servant.starGen/1000) + f((args.quickfirst && (faceCard !== 'NP')) ? 0.2 : 0) + f(cardStarValue * f(1 + cardMod)) + f(serverRate) + f(starGen) + f(0.2 * +(isCrit)) + f(0.3 * +(isMaxOverkill))), 3);

			}

			let minStars = `${parseInt((totalDropChance*100)/100)} stars plus ${((totalDropChance*100)%100).toFixed(2)}% chance`;
			let maxStars = `${parseInt((totalMaxDropChance*100)/100)} stars plus ${((totalMaxDropChance*100)%100).toFixed(2)}% chance`;

			starfields = [
				{name: 'Star Gen', value: `${emojis.find(e=>e.name==='instinct')} ${servant.starGen/10}%`, inline: true},
				{name: 'Quick First', value: `${emojis.find(e=>e.name==='quickfirst')} ${!!args.quickfirst}`, inline: true},
				{name: 'Critical', value: `${emojis.find(e=>e.name==='crit')} ${isCrit}`, inline: true},
				{name: 'Cardmod', value: `${emojis.find(e=>e.name==='avatar')} ${cardMod}`, inline: true},
				{name: 'Server Rate Mod', value: `${emojis.find(e=>e.name==='berserker')} ${serverRate}`, inline: true},
				{name: 'Star Gen Mod', value: `${emojis.find(e=>e.name==='stargen')} ${starGen}`, inline: true},
				{name: 'Card Star Value', value: `${emojis.find(e=>e.name==='starrateup')} ${cardStarValue}`, inline: true},
				{name: 'Minroll Stars Gained', value: `${emojis.find(e=>e.name==='instinct')} ${minStars}`},
				{name: 'Maxroll Stars Gained', value: `${emojis.find(e=>e.name==='instinct')} ${maxStars}`}
			];

			console.log(args.quickfirst);
			starGenEmbed = {
				title: 'Star Gen:',
				fields: starfields
			};

		}

		if (args.enemyhp != null) {

			let servantNpGain = servant.noblePhantasms[np].npGain.np[npLevel], minNPRgen = 0, maxNPRegen = 0, enemyHp = (args.enemyhp ?? 0), maxrollEnemyHp = (args.enemyhp ?? 0);
			let descriptionString = '', npfields = [];
			let cardNpValue = 0,enemyServerMod = 0, artsFirst = (args.artsfirst) ? 1 : 0;
			let isOverkill = 0, isMaxOverkill = 0, baseNPGain = 0, minrollTotalVal = 0.9 * f(total - fD) + fD, maxrollTotalVal = 1.099 * f(total - fD) + fD, overkillNo = 0, maxOverkillNo = 0;

			switch (`${(faceCard === 'NP') ? servant.noblePhantasms[np].card : faceCard.toLowerCase()}`) {
				case 'arts': cardNpValue = 3; break;
				case 'quick': cardNpValue = 1; break;
				case 'buster': cardNpValue = 0; break;
				case 'extra': cardNpValue = 1; break;
				default: cardNpValue = 1; break;
			}

			cardNpValue = args.cardrefundvalue ?? cardNpValue;

			if (args.second && (faceCard !== 'NP')) cardNpValue *= 1.5;
			if (args.third && (faceCard !== 'NP')) cardNpValue *= 2;

			switch (enemyClass) {
				case 'rider': enemyServerMod = 1.1; break;
				case 'caster': enemyServerMod = 1.2; break;
				case 'assassin': enemyServerMod = 0.9; break;
				case 'berserker': enemyServerMod = 0.8; break;
				case 'moonCancer': enemyServerMod = 1.2; break;
				default: enemyServerMod = 1; break;
			}

			if ((cardNpValue === 3 &&  !(args.second || args.third)) || args.artsfirst) artsFirst = 1;

			enemyServerMod = args.enemyservermod ?? enemyServerMod;

			npfields = [
				{name: 'NP Gain', value: `${emojis.find(e=>e.name==='npgen')} ${servantNpGain/100}`, inline: true},
				{name: 'Arts First', value: `${emojis.find(e=>e.name==='artsfirst')} ${!!artsFirst}`, inline: true},
				{name: 'Critical', value: `${emojis.find(e=>e.name==='crit')} ${isCrit}`, inline: true},
				{name: 'Cardmod', value: `${emojis.find(e=>e.name==='avatar')} ${cardMod}`, inline: true},
				{name: 'Enemy Server Mod', value: `${emojis.find(e=>e.name==='berserker')} ${enemyServerMod}`, inline: true},
				{name: 'NP Gain Mod', value: `${emojis.find(e=>e.name==='npgen')} ${npGen}`, inline: true},
				{name: 'Card Attack Multiplier', value: `${(faceCard === 'NP') ? emojis.find(e=>e.name===servant.noblePhantasms[np].card) : emojis.find(e=>e.name===faceCard.toLowerCase())} ${cardValue}x`, inline: true},
				{name: 'Card Refund Value', value: `${emojis.find(e=>e.name==='npbattery')} ${cardNpValue}`, inline: true}
			];

			descriptionString = '```\n|Hit | Damage |Enemy HP| Refund |\n';

			for (let i = 0; i < hits.length; i++) {

				let hit = hits[i], thisHitMinDamage = f(minrollTotalVal * f(hit) / f(100)), thisHitMaxDamage = Math.floor(f(maxrollTotalVal * f(hit) / f(100)));

				isOverkill = +(thisHitMinDamage > (0.5 * enemyHp));
				isMaxOverkill = +(thisHitMaxDamage > (0.5 * maxrollEnemyHp));
				enemyHp -= thisHitMinDamage;
				maxrollEnemyHp -= thisHitMaxDamage;
				overkillNo += isOverkill;
				maxOverkillNo += isMaxOverkill;

				baseNPGain = f(servantNpGain) * f(f((artsFirst && faceCard !== 'NP') ? 1 : 0) +  f(f(cardNpValue) * f(1 + (args.extra ? 0 : cardMod))))
						* f(enemyServerMod) * f(1 + npGen);

				minNPRgen += Math.floor(Math.floor(baseNPGain * f(1 + (+isCrit))) * f((2 + isOverkill)/2)) / 100;
				maxNPRegen += Math.floor(Math.floor(baseNPGain * f(1 + (+isCrit))) * f((2 + isMaxOverkill)/2)) / 100;

				descriptionString += "| " + ((i+1)+'   ').substring(0, 3) + "| " +(Math.floor(thisHitMinDamage)+' '.repeat(7)).substring(0, 7) + "|" + (Math.floor(enemyHp)+' '.repeat(8)).substring(0, 8) + "| " + (minNPRgen.toFixed(2)+"%"+' '.repeat(7)).substring(0, 7) + "|\n";

				console.log(`thisHitDamage: ${thisHitMaxDamage},\nremainingHp: ${maxrollEnemyHp},\nisOverkill: ${isMaxOverkill}\n`);
			}

			descriptionString += '```';

			npfields.push({name: 'NP Gain Sim', value: descriptionString, inline: false});
			npfields.push({name: 'Total Minroll Refund', value: `**${minNPRgen.toFixed(2)}%** ${emojis.find(e=>e.name==='npbattery')} (${overkillNo} overkill hits)`, inline: false});
			npfields.push({name: 'Total Maxroll Refund', value: `**${maxNPRegen.toFixed(2)}%** ${emojis.find(e=>e.name==='npbattery')} (${maxOverkillNo} overkill hits)`, inline: false});

			npGainEmbed = {
				title: 'NP Gain Calc:'
			};

			if (!('fields' in npGainEmbed)) npGainEmbed.fields = [];

			npGainEmbed.fields = [...npGainEmbed.fields, ...npfields];

		}

		const replyEmbed = {
			title: `${faceCard} damage for ${emojis.find(e=>e.name===servant.className.toLowerCase())} ${servantName}`,
			thumbnail: {
				url: servant.extraAssets.faces.ascension[Object.keys(servant.extraAssets.faces.ascension).length - 1]
			},
			description: `**${total.toLocaleString()}** (${(Math.floor(0.9 * (total - fD) + fD)).toLocaleString()} to ${Math.floor((1.099 * (total - fD) + fD)).toLocaleString()})`
		};

		if (warnMessage) {

			if (!('fields' in replyEmbed)) replyEmbed.fields = [];

			replyEmbed.fields.push({
				name: 'Warnings',
				value: warnMessage
			});
		}

		let reply = [{embed: replyEmbed}];

		if (args.enemyhp != undefined) reply = [{embed: replyEmbed}, {embed: npGainEmbed}];

		if (args.stars) reply = [{embed: replyEmbed}, {embed: starGenEmbed}];

		if (args.verbose) {

			const verboseEmbed = {
				title: `${faceCard} damage for ${emojis.find(e=>e.name===servant.className.toLowerCase())} ${servantName} using:`
			};


			if (!('fields' in verboseEmbed)) verboseEmbed.fields = [];

			newfields = [
				{name: 'Base Attack', value: atk - (args.fou ?? 1000) - (args.ce ?? 0), inline: true},
				{name: 'Fou Attack', value: (args.fou ?? 1000), inline: true},
				{name: 'Level', value: (args.level ?? servant.lvMax), inline: true},
				{name: 'Strengthen', value: `${(!!+np) ? emojis.find(e=>e.name==='nplewd') : emojis.find(e=>e.name==='nolewd')} ${!!+np}`, inline: true},
				{name: 'CE Attack', value: (args.ce ?? 0), inline: true},
				{name: 'Class Attack Mod', value: `${emojis.find(e=>e.name===servant.className)} ${+(classList[servant.className]/1000).toFixed(2)}x`, inline: true},
				{name: 'Class Advantage', value: `${advantage}x`, inline: true},
				{name: 'Card Attack Multiplier', value: `${(faceCard === 'NP') ? emojis.find(e=>e.name===servant.noblePhantasms[np].card) : emojis.find(e=>e.name===faceCard.toLowerCase())} ${cardValue}x`, inline: true},
				{name: 'CardMod', value: `${(faceCard === 'NP') ? emojis.find(e=>e.name===servant.noblePhantasms[np].card+'mod') : emojis.find(e=>e.name===faceCard.toLowerCase()+'mod')} ${cardMod*100}%`, inline: true},
				{name: 'Attribute Advantage', value: `${attributeAdvantage}x`, inline: true},
				{name: 'Damage %', value: `${(faceCard === 'NP') ? emojis.find(e=>e.name===servant.noblePhantasms[np].card) : emojis.find(e=>e.name===faceCard.toLowerCase())} ${((faceCard !== 'NP') ? cardValue : npMulti)*100}%`, inline: true},
			];

			newfields.push({name: 'ATKMod', value: `${emojis.find(e=>e.name==='charisma')} ${atkMod*100}%`, inline: true});
			newfields.push({name: 'DEFMod', value: `${emojis.find(e=>e.name==='defup')} ${defMod*100}%`, inline: true});
			newfields.push({name: 'NP Mod', value: `${emojis.find(e=>e.name==='npmod')} ${npMod*100}%`, inline: true});
			newfields.push({name: 'Supereffective Mod', value: `${emojis.find(e=>e.name==='overcharge')} ${(1 + seMod)}x`, inline: true});
			newfields.push({name: 'PowerMod', value: `${emojis.find(e=>e.name==='pmod')}${emojis.find(e=>e.name==='crit')}  ${pMod*100}%`, inline: true});
			newfields.push({name: 'Flat Damage', value: `${emojis.find(e=>e.name==='divinity')} ${(fD.toFixed(1) ?? 0)}`, inline: true});
			newfields.push({name: 'NP Gain', value: `${emojis.find(e=>e.name==='npgen')} ${(args.npgain ?? 0)}%`, inline: true});
			verboseEmbed.fields = [...verboseEmbed.fields, ...newfields]
			reply = [...reply, {embed: verboseEmbed}];

		}

		return reply;

	}
}

async function chain (servantId, argStr, servantName, match) {

	let cards = match.match(/([bqa]|(np))/g), attache = '', totalDamage = 0, minrollTotal = 0, maxrollTotal = 0, description = '', title = '', thumbnail = '', servant, chain = [{}, {}, {}];
	let minEnemyHp, maxEnemyHp, refund = false, minrollTotalRefund = 0, maxrollTotalRefund = 0;

	for (const key of Object.keys(servants)) {

		if (servants[key].collectionNo !== parseInt(servantId)) continue;
		else if (!('noblePhantasms' in servants[key])) continue;
		else servant = servants[key];

	}

	if (servant == undefined) return `Error: Bad servant.`;

	for (let i = 0; i < 3; i++) {

		if (cards[i] === 'np') {
			chain[i].name = servant.noblePhantasms[0].card;
			chain[i].np = true;
		}
		else {
			switch (cards[i]) {
				case 'b':
					chain[i].name = 'buster'; break;
				case 'q':
					chain[i].name = 'quick'; break;
				case 'a':
					chain[i].name = 'arts'; break;
				default:
					break;
			}

			chain[i].np = false;

			switch (i) {
				case 0:
					chain[i].position = 'first'; break;
				case 1:
					chain[i].position = 'second'; break;
				case 2:
					chain[i].position = 'third'; break;
			}
		}
	}

	if (chain[0].name === 'buster') attache += '--bf ';
	else if (chain[0].name === 'arts') attache += '--af ';

	if (chain.every((val, i, a) => (val.name === a[0].name) && (val.name === 'buster'))) attache += '--bc ';
	if (chain.every((val, i, a) => (val.name === a[0].name) && (val.name === 'arts'))) minrollTotalRefund += 20;

	argStr = attache + argStr;
	chain = [...chain, {name: 'extra', np: false}];

	let [baseStr, ...commands] = argStr.split(' --card=');

	for (const command of commands) {

		let cardNo = command[0] - 1;

		chain[cardNo].command = '';

	}

	for (const command of commands) {

		let cardNo = command[0] - 1;

		chain[cardNo].command += command.slice(2) + " ";

		if (chain.every((val, i, a) => (val.name === a[0].name))) chain[3].command += ' --ecm=3.5 ';

	}

	if ((minEnemyHp = baseStr.match(/\s+--hp=\d+/g)) != null) {

		refund = true;
		minEnemyHp = parseInt(minEnemyHp[0].split('=')[1]);
		maxEnemyHp = parseInt(baseStr.match(/\s+--hp=\d+/g)[0].split('=')[1]);
		baseStr = baseStr.replace(/\s+--hp=\d+/g, '');

	}

	for (let i = 0; i < 4; i++) {

		let testReply, testEmbed, card = chain[i], maxAttache, maxtestReply, maxTestEmbed;

		attache = (card.np ? '' : '--' + card.name)  + (card.position ? ' --' + card.position : '') + (refund ? ` --hp=${minEnemyHp} ` : ' ');
		maxAttache = (card.np ? '' : '--' + card.name)  + (card.position ? ' --' + card.position : '') + (refund ? ` --hp=${maxEnemyHp} ` : ' ');
		testReply = await test(servantId, attache + baseStr + ' ' + chain[i].command, servantName);
		maxTestReply = await test(servantId, maxAttache + baseStr + ' ' + chain[i].command, servantName);

		if (Array.isArray(testReply)) {

			testEmbed = testReply[0].embed;
			maxTestEmbed = maxTestReply[0].embed;

			if (testReply[1]?.embed.title !== 'NP Gain Calc:') refund = false;

		}
		else {

			testEmbed = testReply.embed;
			maxTestEmbed = maxTestReply.embed;

		}

		let damageVals = testEmbed.description.replace(/(,)/g, '').match(/[0-9]+/g).map(el => parseInt(el)); //`**meanroll** (minroll to maxroll)`
		let maxDamageVals = maxTestEmbed.description.replace(/(,)/g, '').match(/[0-9]+/g).map(el => parseInt(el)); //`**meanroll** (minroll to maxroll)`

		if (refund && testReply[1]?.embed.title === 'NP Gain Calc:') {

			if (card.np) {

				minrollTotalRefund = 0;
				maxrollTotalRefund = 0;
			}

			minrollTotalRefund += parseFloat(testReply[1].embed.fields.find(el => el.name === 'Total Minroll Refund').value.slice(2));
			maxrollTotalRefund += parseFloat(maxTestReply[1].embed.fields.find(el => el.name === 'Total Maxroll Refund').value.slice(2));
			minEnemyHp -= damageVals[1];
			maxEnemyHp -= maxDamageVals[2];

		}

		totalDamage += damageVals[0];
		minrollTotal += damageVals[1];
		maxrollTotal += damageVals[2];
		title = 'Damage for ' + testEmbed.title.split(' ').slice(3).join(' ') + ':';
		thumbnail = testEmbed.thumbnail;
		description += `${card.np ? emojis.find(e=>e.name==='nplewd') : emojis.find(e=>e.name===card.name)} **${damageVals[0].toLocaleString()}**\n`;

	}

	const replyEmbed = {
		title,
		thumbnail,
		description
	};

	replyEmbed.fields = [{name: 'Total Damage', value: `**${totalDamage.toLocaleString()}** (${minrollTotal.toLocaleString()} to ${maxrollTotal.toLocaleString()})`}];

	if (refund) {

		replyEmbed.fields = [
			...replyEmbed.fields,
			{name: 'Total Minroll Refund', value: `${emojis.find(e=>e.name==='npbattery')} **${minrollTotalRefund.toFixed(2)}%**`},
			{name: 'Total Maxroll Refund', value: `${emojis.find(e=>e.name==='npbattery')} **${maxrollTotalRefund.toFixed(2)}%**`}
		];
	}

	return {embed: replyEmbed};

}

async function wikia (search) {

	return new Promise((resolve, reject) => {

		https.get('https://www.google.com/search?q=site%3Afategrandorder.fandom.com+' + search.replace(/ /g, '+'), function(res) {

			let data = '';

			res.on('data', function (chunk) {

				data += chunk;

			});

			res.on('end', _ => {

				document = (new JSDOM(data, {pretendToBeVisual: true})).window.document;

				let reply = '';

				try {

					reply = '<' + decodeURI(decodeURI(document.querySelector('a[href^="/url?q=https://fategrandorder.fandom.com/wiki/"]').href.slice(7).split('&')[0])) + '>';
					resolve(reply);

				} catch(err) {

					resolve('Error finding result for <https://www.google.com/search?q=site%3Afategrandorder.fandom.com+' + search.replace(/ /g, '+') + '>');

				}

			});
		});


	});
}

async function bing (search) {

	return new Promise((resolve, reject) => {

		https.get('https://www.bing.com/search?q=' + search.replace(/ /g, '+'), function(res) {

			let data = '';

			res.on('data', function (chunk) {

				data += chunk;

			});

			res.on('end', _ => {

				({document} = (new JSDOM(data, {pretendToBeVisual: true})).window);

				let reply = '';

				try {

					reply = '<' + decodeURI(decodeURI(document.querySelector('main[aria-label="Search Results"] h2 a').href)) + '>';
					resolve(reply);

				} catch(err) {

					resolve('Error finding result for <https://www.bing.com/search?q=' + search.replace(/ /g, '+') + '>');

				}

			});
		});
	});
}

function parseCalculationString(s) {
    // --- Parse a calculation string into an array of numbers and operators
    var calculation = [],
        current = '';
    for (var i = 0, ch; ch = s.charAt(i); i++) {
        if ('^*/+-'.indexOf(ch) > -1) {
            if (current == '' && ch == '-') {
                current = '-';
            } else {
                calculation.push(parseFloat(current), ch);
                current = '';
            }
        } else {
            current += s.charAt(i);
        }
    }
    if (current != '') {
        calculation.push(parseFloat(current));
    }
    return calculation;
}

function calculate(calc) {
    // --- Perform a calculation expressed as an array of operators and numbers
    var ops = [{'^': (a, b) => Math.pow(a, b)},
               {'*': (a, b) => a * b, '/': (a, b) => a / b},
               {'+': (a, b) => a + b, '-': (a, b) => a - b}],
        newCalc = [],
        currentOp;
    for (var i = 0; i < ops.length; i++) {
        for (var j = 0; j < calc.length; j++) {
            if (ops[i][calc[j]]) {
                currentOp = ops[i][calc[j]];
            } else if (currentOp) {
                newCalc[newCalc.length - 1] = 
                    currentOp(newCalc[newCalc.length - 1], calc[j]);
                currentOp = null;
            } else {
                newCalc.push(calc[j]);
            }
        }
        calc = newCalc;
        newCalc = [];
    }
    if (calc.length > 1) {
        console.log('Error: unable to resolve calculation: ' + calc);
        return calc;
    } else {
        return calc[0];
    }
}

/*
 * The above two functions (viz. `parseCalculationString` and `calculate`) have been taken and slightly modified from https://stackoverflow.com/a/32292728, written by 'Stuart'.
 */

client.login(config.BOT_TOKEN);
