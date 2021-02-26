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

client.on('ready', () => {
	console.info(`Logged in as ${client.user.tag}!`);
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
			argStr = restArgs.slice(1).join(' ').replace(/([A-z])(-?\d)/g, '$1=$2').replace(/([a-z]+)/gi, '--$1');
			servantId = (+servant === +servant) ? +servant : Object.keys(nicknames).find(id => nicknames[id].includes(servant));

			if (typeof servantId === 'undefined') reply = `No match found for ${servant}`;
			else reply = await test(servantId, argStr.toLowerCase(), servant);

		}
		catch (err) {
			console.log(err);
			reply = err;
		}
	}
	else if (command === 'help') {
		reply = `		__Argument List:__
		**atkmod/a/atk**,
		**npmod/n**,
		**nplevel/np**,
		**npvalue/npv**
		**level/lvl/l**,
		**cardmod/cm/m**,
		**str**,
		**ce/c**,
		**fou/f**,
		**cardvalue/cmv**,
		**npval/npv**,
		**defmod/d**,
		**flatdamage/fd**,
		**semod/se**,
		**pmod/p**,
		**specialdefensemod/sdm**,
		**critdamage**,
		**arts**,
		**quick**,
		**buster**,
		**critical/crit**,
		**busterfirst/bf**,
		**first**,
		**second**,
		**third**,
		**extracardmodifier/ecm**,
		**bbb**`;
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
		if (/*message.channel.id === config.TOHSAKA_ID ||*/ message.author.id === config.VLAD) {

			[id, nickname] = restArgs;console.log(id, nickname, id in nicknames);

			if (id in nicknames) {
				if (!nicknames[id].includes(nickname)) {
					nicknames[id].push(nickname);
					reply = `Set ${id}: ${nickname}`;
					//console.log(`${id}, ${nickname}, ${JSON.stringify(nicknames, null, 2)}`);
					require('fs').writeFileSync('./nicknames.json', JSON.stringify(nicknames, null, 2));
				}
			}
		}
	}

	if (reply) {

		if (Array.isArray(reply)) {

			reply.forEach(message.channel.send);

		}
		else {
			message.channel.send(reply);
		}
	}

	return;

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
		'--first'		:	Number,
		'--second'		:	Number,
		'--third'		:	Number,
		'--extracardmodifier'	:	Number,
		'--bbb'			:	Boolean,
		'--verbose'		:	Boolean,

		//Aliases
		'--v'			:	'--verbose',
		'--a'			:	'--atkmod',
		'--atk'			:	'--atkmod',
		'--n'			:	'--npmod',
		'--np'			:	'--nplevel',
		'--npv'			:	'--npvalue',
		'--lvl'			:	'--level',
		'--l'			:	'--level',
		'--m'			:	'--cardmod',
		'--c'			:	'--ce',
		'--cm'			:	'--cardmod',
		'--f'			:	'--fou',
		'--cmv'			:	'--cardvalue',
		'--npv'			:	'--npvalue',
		'--d'			:	'--defmod',
		'--fd'			:	'--flatdamage',
		'--se'			:	'--semod',
		'--p'			:	'--pmod',
		'--sdm'			:	'--specialdefensemod',
		'--crit'		:	'--critical',
		'--bf'			:	'--busterfirst',
		'--ecm'			:	'--extracardmodifier',
		'--man'			:	'--human',

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
		//if (err.code === 'ARG_UNKNOWN_OPTION') warnMessage +=  err.message.split('--').join('') + '!\n';
		//else throw err;
		console.log(err); return err;
	}

	if (args._.length > 0 && args._.indexOf('') !== 0) warnMessage = `Unrecognised option: ${args['_'][0].substring(2)}!\n`;

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

		servantName = servantName ?? servant.name;

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

		if (parseInt(servantId) <= parseInt(maxNAServant)) nps = Object.keys(NAServants[Object.keys(NAServants).find(x => ((NAServants[x].collectionNo === parseInt(servantId)) && ('noblePhantasms' in NAServants[x])))].noblePhantasms);

		np = nps[nps.length - 1], cardType;

		if (typeof args.str !== 'undefined') {
			np = (args.str ? np : nps[0]);
		}

		if (parseInt(servantId) === 268) np = nps[1];

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

		for (const npFn in npFns) {
			if (npFns[npFn].funcType.includes('damageNp')) {
				npMulti = f(npFns[npFn].svals[npLevel].Value)/f(10);
				break;
			}
		}

		if (npMulti === 0) return `**${servantName}** NP does not deal damage!`;

		npMulti = f(args.npvalue ?? npMulti)/f(100);

		let faceCard = (args.extra || args.buster || args.arts || args.quick) ? true : false;
		let extraCardModifier = 1;
		let busterChainMod = (args.bbb ? (0.2 * atk) : 0);
		let firstCardBonus = 0;

		if (args.defmod && (defMod < -1 || defMod > 1)) {
			warnMessage += 'Defense (de)buffs cannot exceed the range [-100%, 100%]. Setting enemy defense modifier to 0.\n';
			defMod = 0;
		}

		let passiveSkills = passiveSkillSet[servantId];
		let flatDamage = f(args.flatdamage?.reduce((acc, val) => acc + val) ?? 0);
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

		let isCrit = (faceCard && args.crit) || false;
		let total = 0;
		let cardValue = cardType;

		if (typeof args.cardvalue !== 'undefined') {
			if (!([1, 1.5, 0.8].includes(args.cardvalue))) {
				warnMessage += `Card damage value has to be one of [1.5, 0.8, 1]. Setting card damage value to np card value, ${cardType}`;
			}
			else {
				cardValue = parseFloat(args.cardvalue);
			}
		}
		else {
			cardValue = (args.npvalue != null) ? cardType : cardValue;
		}
		if (faceCard) {
			if (args.bbb || args.buster || busterChainMod) {
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

		if (args.bbb) faceCard = true;

		if (args.bbb || args.busterfirst) {
			firstCardBonus = 0.5;

			if (args.extra) extraCardModifier = 3.5;
		}

		firstCardBonus = faceCard ? firstCardBonus : 0;
		firstCardBonus = args.extra ? 0 : firstCardBonus;
		npMulti = faceCard ? 1 : npMulti;

		switch (cardValue) {
			case 0.8:
				critDamage += f(parseFloat(passiveSkills.critdamage?.quick ?? 0))/f(100);
				cardMod +=  f(parseFloat(passiveSkills.cardmod?.quick ?? 0))/f(100);
				break;
			case 1:
				critDamage += f(parseFloat(passiveSkills.critdamage?.arts ?? 0))/f(100);
				cardMod += f(parseFloat(passiveSkills.cardmod?.arts ?? 0))/f(100);
				break;
			case 1.5:
				critDamage += f(parseFloat(passiveSkills.critdamage?.buster ?? 0))/f(100);
				cardMod += f(parseFloat(passiveSkills.cardmod?.buster ?? 0))/f(100);
				break;
		}

		flatDamage += f(parseFloat(passiveSkills.flatdamage?.value ?? 0));
		npGen += f(parseFloat(passiveSkills.npgen?.value ?? 0))/f(100);
		npMod += f(parseFloat(passiveSkills.npmod?.value ?? 0))/f(100);

		if (pMod > 10) {
			warnMessage += 'Powermod cannot go above 1000%, setting to 1000%\n';
		}

		let val = f(atk) * f(servantClassRate) * f(advantage) * f(firstCardBonus + f(cardValue) * f(Math.max(f(1 + cardMod), 0))) * f(attributeAdvantage) * f(0.23) * f(npMulti) * f(extraCardModifier)
			* f(Math.max(f(1 + atkMod - defMod), 0)) * f(Math.max(f(1 - specialDefMod), 0)) * f(Math.max(f(1 + pMod + (critDamage * +(isCrit)) + (npMod * +(!faceCard))), 0.001)) * f(1 + seMod)
			+ f(flatDamage) + f(atk * (args.bbb ? 0.2 : 0));

		for (const hit of hits.slice(0, hits.length - 1)) {
			total += val * f(f(hit)/f(100)); //add until second-to-last, then add the difference
		}

		total += (val - total);
		total = Math.floor(total);

		if (args.arts) faceCard = 'arts';
		else if (args.quick) faceCard = 'quick';
		else if (args.extra) faceCard = 'extra';
		else if (args.buster || args.bbb) faceCard = 'buster';
		else faceCard = 'NP';

		fD = f(flatDamage) + f(atk * (args.bbb ? 0.2 : 0));

		const replyEmbed = {
			title: `${faceCard} damage for ${servantName}`,
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

		if (args.verbose) {

			const verboseEmbed = {
				title: `${faceCard} damage for ${servantName} using:`
			};


			if (!('fields' in verboseEmbed)) verboseEmbed.fields = [];

			newfields = [
				{name: 'Base Attack', value: atk - (args.fou ?? 1000) - (args.ce ?? 0), inline: true},
				{name: 'Fou Attack', value: (args.fou ?? 1000), inline: true},
				{name: 'Class Attack Mod', value: `${servantClassRate}x`, inline: true},
				{name: 'Class Advantage', value: `${advantage}x`, inline: true},
				{name: 'Card Attack Multiplier', value: `${cardValue}x`, inline: true},
				{name: 'CardMod', value: `${cardMod*100}%`, inline: true},
				{name: 'Attribute Advantage', value: `${attributeAdvantage}x`, inline: true},
				{name: 'NP Multiplier', value: `${npMulti*100}%`, inline: true},
			];

			if (faceCard === 'NP') {
				newfields.push({name: 'np special attack', value: f(1 + seMod), inline: true});
			} else {
				newfields.push({name: 'first card bonus (included)', value: f(firstCardBonus), inline: true});
				newfields.push({name: 'extra card modifier', value: f(extraCardModifier), inline: true});
				newfields.push({name: 'buster chain damage plus', value: f(atk * (args.bbb ? 0.2 : 0)), inline: true});
			}

			newfields.push({name: 'ATKMod', value: `${atkMod}%`, inline: true});
			newfields.push({name: 'DEFMod', value: `${-defMod}%`, inline: true});
			newfields.push({name: 'Damage Reduction', value: specialDefMod, inline: true});
			newfields.push({name: 'Supereffective Mod', value: `${(1 + seMod)}x`, inline: true});
			newfields.push({name: 'flat damage', value: f(flatDamage), inline: true});
			verboseEmbed.fields = [...verboseEmbed.fields, ...newfields]

		}

		return {embed: replyEmbed};

	}
}

client.login(config.BOT_TOKEN);
