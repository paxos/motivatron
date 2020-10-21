import { IConfig } from "./config/config";
import { IContext } from "./lib/context";
import { DevOpsClient } from "./lib/devops";
import { IntercomClient } from "./lib/intercom";
import { SlackClient } from "./lib/slack";

export { getConfig } from "./config/config";

export class Motivatron {
  private config: IConfig;
  private readonly context: IContext;

  constructor(context: IContext, config: IConfig) {
    this.config = config;
    this.context = context;
  }

  async doThings(): Promise<void> {
    for (let team of this.config.teams) {
      this.context.log(`Doing work for team ${team.name}`);

      // Intercom Inboxes
      let intercomResults = [];
      for (let intercomTeam of team.intercomTeams) {
        let intercomClient = new IntercomClient(this.context, intercomTeam);

        // Intercom
        this.context.log(
          `Fetching intercom for team ${team.name}, inbox ${intercomTeam.inboxName}…`
        );
        await intercomClient.fetchOpenTickets();
        intercomResults.push(await intercomClient.getText());
      }

      let finalMessage = [];

      // DevOps
      for (let devOpsTeam of team.devOpsTeams) {
        let devOpsClient = new DevOpsClient(this.context, devOpsTeam);

        this.context.log(`Fetching DevOps for team ${devOpsTeam}…`);
        await devOpsClient.fetchPullRequests();
        let teamSummary = devOpsClient.getTextAzureDevOps(team.name);
        let teamPRs = devOpsClient.filteredPullRequestsToURLList()

        finalMessage.push(teamSummary);
        finalMessage.push(teamPRs.join("\n"));
      }

      finalMessage.push(intercomResults.join("\n"))

      let slackClient = new SlackClient(this.context, team);
      await slackClient.sendToSlack(finalMessage);
    }
  }
}
