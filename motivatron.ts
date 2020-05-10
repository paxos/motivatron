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

      let devOpsClient = new DevOpsClient(this.context, team.devOpsTeams[0]);

      // DevOps
      this.context.log(`Fetching DevOps for team ${team.name}…`);
      await devOpsClient.fetchPullRequests();

      let result = [devOpsClient.getTextVSTS(), intercomResults.join(" ")];
      let message = result.join(" ") + devOpsClient.PRsToURLList();

      this.context.log(message);

      let slackClient = new SlackClient(this.context, team);
      await slackClient.sendToSlack(message);
    }
  }
}
