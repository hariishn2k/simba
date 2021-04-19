import requests
import re
import json
from bs4 import BeautifulSoup
import urllib.parse
from collections import defaultdict

def setDefaults (servant):
    for key in [*servant]:
        if key == 'critdamage' or key == 'cardmod':
            servant[key].setdefault('buster', 0)
            servant[key].setdefault('arts', 0)
            servant[key].setdefault('quick', 0)

def switch (buffName, value, card=None):
    critDict = {}
    if card == 'buster':
        critDict = {'critdamage': {'buster': value, 'arts': 0, 'quick': 0}}
    elif card == 'arts':
        critDict = {'critdamage': {'buster': 0, 'arts': value, 'quick': 0}}
    elif card == 'quick':
        critDict = {'critdamage': {'buster': 0, 'arts': 0, 'quick': value}}
    else:
        critDict = {'critdamage': {'buster': value, 'arts': value, 'quick': value}}
    buffDict = {
      "critical damage": critDict,
      "Buster performance": {'cardmod': {'buster': value}},
      "critical star generation rate": {'stargen': {'value': value}},
      "damage": {'flatdamage': {'value': value}},
      "Quick performance": {'cardmod': {'quick': value}},
      "Arts performance": {'cardmod': {'arts': value}},
      "critical damage of  Arts Cards": {'critdamage': {'arts': value}},
      "NP generation rate": {'npgen': {'value': value}},
      "critical damage of Buster Cards": {'critdamage': {'buster': value}},
      "critical damage of Quick Cards": {'critdamage': {'quick': value}},
      "NP damage": {'npmod': {'value': value}}
    }
    return buffDict.get(buffName).copy()

servants = {}
servantIds = {}

url = 'https://fategrandorder.fandom.com/wiki/Servant_List_by_ID'
response = requests.get(url, timeout = 10)
soup = BeautifulSoup(response.content, 'html.parser')
tables = soup.select('table.wikitable.sortable')
for table in tables:
    if table.find('th'):
        table.find('th').decompose()
    table.find('tbody').unwrap()
    for row in table.find_all('tr'):
        rowData = row.find_all('td')
        if rowData == []:
            continue
        [_, servantName, _, servantId] = [rowd.get_text().strip() for rowd in rowData]
        servantIds[servantName] = servantId
servantIds = json.loads(json.dumps(servantIds, ensure_ascii=False))

url = "https://fategrandorder.fandom.com/wiki/Passive_Skills"
response = requests.get(url, timeout = 10)
soup = BeautifulSoup(response.content, 'html.parser')
tables = soup.find_all('table')
for table in tables:
    for element in table.find_all('noscript'):
                element.decompose()
    for th in table.find_all('th'):
        th.decompose()
    for td in table.find_all('td'):
        for div in td.find_all('div'):
            td.decompose()
    for td in table.find_all('td', {'class': 'ServantsWithSkill'}):
            td.img.replace_with(td.img['alt'][:-8])
    for td in table.find_all('td'):
            for img in td.find_all('img'):
                img.unwrap()
    for td in table.find_all('td'):
            for br in td.findAll('br'):
                br.unwrap()
    for td in table.find_all(lambda tag: tag.name == 'td' and not tag.attrs):
        td.decompose()
    for tr in soup.find_all('tr'):
        if not tr.find_all():
            tr.extract()
    table.tbody.unwrap()

for table in tables:
    rows = table.select('tr > td[colspan="2"]')
    if not rows.__len__() > 0:
        continue
    [skillNode, servantsNode] = rows
    for a in servantsNode.find_all('a'):
        try:
            servantId = servantIds[urllib.parse.unquote(a['href'].split('wiki/')[1]).replace('_', ' ')]
        except:
            continue
        if not servantId in servants:
            servants[servantId] = {}
        skills = [skill.strip('%.') for skill in re.split('\.\W+(?=\w)', skillNode.get_text().strip('\n ')) if (skill is not '')]
        for skill in skills:
            if skill.find('Demerit]') == -1 and skill.find('except themselves') == -1:
                if (skill.find('star absorption') == -1 and skill.find('against') == -1 and skill.find('resistance') == -1 and skill.find('healing') == -1 and skill.find('defense') == -1 and skill.find('taking damage') == -1 and skill.find('Buff') == -1 and skill.find('buff') == -1) and skill.startswith('Increases own'):
                    skill = skill.split(' ', 2)[2]
                    [buff, value] = skill.split(' by ')
                    card = 'all'
                    value = float(value)
                    if ' of ' in buff:
                        [buff, card] = re.split('\ of\W+', buff)
                        card = card.split(' ')[0].lower()
                        buff = switch(buff, value, card)
                    else:
                        buff = switch(buff, value)
                    if not [*buff][0] in [*servants[servantId]]:
                        servants[servantId] = {**servants[servantId], **buff}
                        setDefaults(servants[servantId])
                    else:
                        buffName = [*buff][0]
                        cardNames = [*buff[buffName]]
                        if card == 'all':
                            for cardName in cardNames:
                                servants[servantId][buffName][cardName] += value
                        else:
                            servants[servantId][buffName][card] += value
servants['1']['cardmod']['quick'] = float(6.0)

with open('skills-passive.json', 'w', encoding='utf-8') as f:
    json.dump({int(x):servants[x] for x in [*servants]}, f, ensure_ascii=False, indent=2, sort_keys=True)

#print(json.dumps({int(x):servants[x] for x in [*servants]}, ensure_ascii=False, indent=2, sort_keys=True))

open('nice_servant.json', 'wb').write(requests.get("https://api.atlasacademy.io/export/NA/nice_servant.json").content)
#print(requests.get("https://api.atlasacademy.io/export/NA/nice_servant.json").content)

open('nice_servant_jp.json', 'wb').write(requests.get("https://api.atlasacademy.io/export/JP/nice_servant.json").content)