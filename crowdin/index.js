const { Reports } = require('@crowdin/crowdin-api-client');
const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config();

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
      console.error('generateReport', error);
      return false;
    }

    // Check the status of the report.
    while (!reportReady && reportStatusCount <= apiMaxTryCount) {
      try {
        report = await api.checkReportStatus(projectId, reportId);
        reportReady = report.data.status === 'finished';
        console.log(`Checked report status, result is: ${report.data.status}.`);
      } catch (error) {
        console.error('checkReportStatus', error);
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
      console.error('downloadReport', error);
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

          // Some people only vote, require at least some activity before being counted.
          // NOTE: the unit is words (ln 27), so this currently requires at least 10 translated words.
          if (item.translated < 10) return;

          const key = language.name;
          if (!users[key]) users[key] = [];

          users[key].push(item.user.username);
          users[key].sort((a, b) => a.localeCompare(b, 'en-US', { 'sensitivity': 'base' }));
        });
      });

      const ordered = {};
      Object.keys(users).sort().forEach(function (key) {
        ordered[key] = users[key];
      });

      return ordered;
    } catch (error) {
      console.error('parse', error);
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

    const header = '# Localisation contributors';
    const body = `Thanks to the following people for helping translate the project! If you are savvy in a language and feel like you want to help out, we'd greatly appreciate it! You can contribute by translating on our [Crowdin project](${process.env.PROJECT_URL}).`;

    let result = `${header}\n${body}\n\n`;

    Object.keys(members).forEach(function (key) {
      result += `${key}:\n`;

      const users = members[key];
      users.forEach(user => {
        result += `  - ${user}\n`;
      });

      result += '\n';
    });

    fs.writeFileSync('langs/README.md', result);

    console.log('README updated.');
  } catch (error) {
    console.error('updateReadme', error);
  }
}

updateReadme();
