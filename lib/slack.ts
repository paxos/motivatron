import { IConfigTeam } from "../config/config";
import { IContext } from "./context";
const axios = require("axios").default;

export class SlackClient {
  protected team: IConfigTeam;
  protected context: IContext;

  constructor(context: IContext, team: IConfigTeam) {
    this.context = context;
    this.team = team;
  }

  makePayload(message: string): any {
    return {
      method: "post",
      headers: {
        "Content-type": "application/json",
      },
      url: this.team.slackIncomingHook,
      data: {
        text: message,
      },
    };
  }

  async sendToSlack(message: string[]): Promise<void> {
    let messageString = message.join("\n")
    this.context.log(messageString);
    return this.sendToSlackInternal(messageString);
  }
  async sendToSlackInternal(message: string): Promise<void> {
    let options = this.makePayload(message);

    try {
      let result = await axios.request(options);
    } catch (e) {
      this.context.log("Something failed while sending a message to Slack!");
      this.context.log(e);
    }
  }
}
