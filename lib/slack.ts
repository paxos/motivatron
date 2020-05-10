import { IConfigTeam } from "../config/config";
import { IContext } from "./context";
const axios = require("axios").default;

export interface ISlackClient {
  sendToSlack(message: string): void;
}
export abstract class SlackBaseClient implements ISlackClient {
  protected team: IConfigTeam;
  protected context: IContext;

  constructor(context: IContext, team: IConfigTeam) {
    this.context = context;
    this.team = team;
  }

  makePayload(message: String): any {
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

  abstract sendToSlack(message: string): void;
}

export class SlackClient extends SlackBaseClient implements ISlackClient {
  async sendToSlack(message: string): Promise<void> {
    let options = this.makePayload(message);

    try {
      let result = await axios.request(options);
    } catch (e) {
      this.context.log("Something failed while sending a message to Slack!");
      this.context.log(e);
    }
  }
}
