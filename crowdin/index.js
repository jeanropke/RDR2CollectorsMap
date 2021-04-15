const { TranslationStatus, Reports } = require('@crowdin/crowdin-api-client');
const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config();

const status = new TranslationStatus({
  token: process.env.API_TOKEN,
});

const api = new Reports({
  token: process.env.API_TOKEN,
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getTopMembers() {
  try {
    const projectId = process.env.PROJECT_ID;
    const apiMaxTryCount = 5;

    const projectProgress = {};
    try {
      const progress = await status.getProjectProgress(projectId, 500);
      progress.data.forEach(language => {
        const data = language.data;
        projectProgress[data.languageId] = data.translationProgress;
      });
    } catch (error) {
      console.error('getProjectProgress', JSON.stringify(error));
    }

    let report = null;
    let reportId = null;
    let reportReady = false;
    let reportStatusCount = 1;
    let reportLink = null;

    const reportName = 'top-members';
    const reportSchema = {
      'unit': 'words',
      'format': 'json',
    };

    // Create the report's request.
    try {
      report = await api.generateReport(projectId, {
        name: reportName,
        schema: reportSchema,
      });

      reportId = report.data.identifier;
      console.log(`Created a report with ID ${reportId}.`);
    } catch (error) {
      console.error('generateReport', JSON.stringify(error));
      return false;
    }

    // Check the status of the report.
    while (!reportReady && reportStatusCount <= apiMaxTryCount) {
      try {
        report = await api.checkReportStatus(projectId, reportId);
        reportReady = report.data.status === 'finished';
        console.log(`Checked report status, result is: ${report.data.status}.`);
      } catch (error) {
        console.error('checkReportStatus', JSON.stringify(error));
        reportReady = false;
      }

      reportStatusCount++;
      await sleep(1000 * reportStatusCount);
    }

    // We tried `apiMaxTryCount` times and the report can't be finished.
    if (!reportReady) return false;

    // Get the download link for the report.
    try {
      reportLink = await api.downloadReport(projectId, reportId);
      console.log(`Retrieved the report with ID ${reportId}.`);
    } catch (error) {
      console.error('downloadReport', JSON.stringify(error));
      return false;
    }

    // Transform the report JSON to a more friendly structure.
    try {
      const result = await fetch(reportLink.data.url);
      const json = await result.json();

      let users = {};

      json.data.forEach(item => {
        item.languages.forEach(language => {
          // I don't really count as translator.
          if (item.user.id === '14157933') return;

          // Jean only really translates Portuguese.
          if (item.user.id === '12829574' && language.id !== 'pt-BR') return;

          // Some people only vote, require at least some activity before being counted.
          // NOTE: the unit is words (ln 27), so this currently requires at least 10 translated words.
          if (item.translated < 10) return;

          const key = `${language.name} (${projectProgress[language.id]}%)`;
          if (!users[key]) users[key] = [];

          users[key].push(`**${item.user.username}** (${new Intl.NumberFormat('en-US').format(item.translated)} words)`);
          users[key].sort((a, b) => a.localeCompare(b, 'en-US', { 'sensitivity': 'base' }));
        });
      });

      const ordered = {};
      Object.keys(users).sort().forEach(function (key) {
        ordered[key] = users[key];
      });

      try {
        // Save a file with the latest translation progress.
        var replacements = {
          'en-GB': 'en_GB',
          'es-ES': 'es',
          'pt-BR': 'pt_BR',
          'pt-PT': 'pt',
          'sv-SE': 'sv',
          'zh-CN': 'zh_Hans',
          'zh-TW': 'zh_Hant',
        };

        Object.keys(replacements).forEach(key => {
          const value = replacements[key];
          projectProgress[value] = projectProgress[key];
          delete projectProgress[key];
        });

        fs.writeFileSync('data/lang_progress.json', JSON.stringify(projectProgress));
      } catch (error) {
        console.error('langProgress', JSON.stringify(error));
      }

      return ordered;
    } catch (error) {
      console.error('parse', JSON.stringify(error));
      return false;
    }
  } catch (error) {
    return false;
  }
}

async function updateReadme() {
  try {
    const members = await getTopMembers();

    if (!members) {
      console.error('Function getTopMembers failed for whatever reason, aborting...');
      return;
    }

    let result = '';

    result += '# Localisation contributors\n';
    result += `Thanks to the following people for helping translate the project! If you are savvy in a language and feel like you want to help out, we'd greatly appreciate it! You can contribute by translating on our [Crowdin project](${process.env.PROJECT_URL}).\n\n`;

    result += '## Pre-Crowdin Contributors\n';
    result += "We'd like to also mention the people that helped translate before the project switched to Crowdin, namely **Asya**, **flameango**, **githb123**, **glaseca**, **Gromino**, **iliggalodin**, **jeanropke**, **Kaffe97**, **Kiddamned**, **Klinorin**, **Korfeeeezy**, **Michal__d**, **MSSatari**, **Nopitch**, **Overnoes**, **pb29**, **qiexia**, **Raffox97**, **Rakmarok**, **rbcunhadesign**, **Senexis**, **sporb**, **Tiax**, **Vitor-Borba72**, **yamazakitouma**, and **yeradd12**.\n\n";

    result += '## RDO Map Contributors\n';
    result += "The following people helped translate the RDO Map specifically but are possibly not included on the list below: **1751020005**, **1Jay1**, **578218087**, **a.equis23**, **abdulkadiraktas**, **Aboodsaad27**, **akbcd**, **aksu.smal**, **Alexified**, **Anvnamnet**, **Aronsfeld**, **AshTurquoise**, **Atarufox**, **avojta**, **Balesz**, **beskorjake2332**, **BHT256**, **birseysoylicem**, **bruno.jacquin**, **Bruxes**, **chanito86**, **CoolBreeze-13s**, **curryguru**, **daveo979**, **djenerg**, **Doringl**, **dramatic_prophet**, **DrNuts**, **dudiv5674**, **dvagos7**, **eduardvlog**, **emrullahsimsar**, **Enrik014**, **escaliburos**, **esershnr**, **esj.h**, **ethandaxps4**, **FilipeLuk**, **FilipFelipe**, **FRANCESCADOLORES**, **FrankTVPL**, **GiorgioHerbie**, **grmaster5s**, **h_p_38**, **harleyhawke**, **HeadShot557**, **hellcat_tail**, **i_NaifKhaldi**, **idiot.rejected**, **ilyuas73**, **ingoonline11**, **Jabaay**, **JeanBankarbone**, **jeanropke**, **jeremymm1538**, **JoseLopez95**, **juandamanacor2013**, **julianforce**, **jurn0818**, **k4makazy**, **kaeporatheglitcha**, **kagurazakakotori**, **Korax94**, **Krykl**, **L1Chung**, **L2**, **L4**, **libidosiemens**, **lorenzoitalia**, **Ltf007**, **LucaBa**, **Matityahuu**, **Mattablatta**, **MEE5RUS**, **Megitsune**, **menbou**, **mgoebelm**, **michaelahofer**, **Michal__d**, **mixsiarz**, **mojan66**, **MrFermz**, **mrsanze6**, **msfern**, **Nacuman.exe**, **nahov91**, **nellonenollen**, **neohazukibr**, **Njordude**, **Nydrail**, **Overnoes**, **Pabeu**, **pach318**, **paeulchen.j**, **PeanutSlinger**, **petter.landsem.krogstad**, **PLTytus**, **Pocholo95**, **poeblu85**, **pozitive95**, **qiexiacn**, **raffouk40**, **Raffox97**, **ranforingus**, **re4k117**, **RichardC.P.**, **romuald.vanrock**, **sandratormo20**, **sayt_itoxiikoz**, **Scotmanhands**, **shar13f4**, **Shineberg**, **skonky**, **SkyFisherGames**, **SoSuz**, **Srandokan**, **ssh2**, **starblunter**, **SwinHulk**, **tabandi**, **tegetron**, **tercumantanumut**, **tharchangl**, **Tharek_Tolemac**, **TheBango**, **Tony_Bell**, **tuwangi**, **vega7621**, **viliri**, **Vinnie5412**, **W10075343**, **warkoun**, **werhel**, **wiiwil**, **windharp**, **y_ksq**, **YuYusS**, and **zrubio**\n\n"
    
    result += '## Crowdin Contributors\n';
    result += 'These are the people that helped translate the project using Crowdin. Please note that Crowdin might not always report accurate numbers due to contributions from before Crowdin.\n\n';

    Object.keys(members).forEach(function (key) {
      result += `### ${key}:\n`;

      const users = members[key];
      users.forEach(user => {
        result += `  - ${user}\n`;
      });

      result += '\n';
    });

    fs.writeFileSync('langs/README.md', result);

    console.log('README updated.');
  } catch (error) {
    console.error('updateReadme', JSON.stringify(error));
  }
}

updateReadme();
