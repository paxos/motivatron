const fs = require("fs");

export interface IConfig {
  teams: IConfigTeam[];
}

export interface IConfigTeam {
  name: string;
  slackIncomingHook: string;
  intercomTeams: IIntercomTeam[];
  devOpsTeams: IDevOpsTeam[];
}

export interface IIntercomTeam {
  inboxName: string;
  token: string;
  team: string;
}

export interface IDevOpsTeam {
  token: string;
  team: string;
  // Take an example URL: dev.azure.com/{collection}/{project}/_apis/git/repositories/{repository}/pullrequests?api-version=4.1
  collection: string;
  project: string;
  repository: string;
  filters?: string[]; // Excludes pull requests who's title matches one of the regular expressions
}

export function getConfig(path = "./config/config.json"): IConfig {
  let configData = fs.readFileSync(path);

  // TODO: Can we validate this better?
  return JSON.parse(configData);
}
