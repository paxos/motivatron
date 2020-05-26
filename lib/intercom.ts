import { IIntercomTeam } from "../config/config";
import { IContext } from "./context";
import { IntercomResponse } from "./models/intercomResponse";
const axios = require("axios").default;

export interface IIntercomClient {
  fetchOpenTickets();
  getNotSnoozedOpenTickets();
  getSnoozedOpenTickets();
  getText(): string;
}
export class IIntercomBaseClient {
  protected intercomTeam: IIntercomTeam;
  protected context: IContext;
  tickets: IntercomResponse;

  constructor(context: IContext, intercomTeam: IIntercomTeam) {
    this.context = context;
    this.intercomTeam = intercomTeam;
  }

  makePayload(): any {
    return {
      method: "get",
      json: true,
      url: `https://api.intercom.io/conversations?type=admin&admin_id=${this.intercomTeam.team}&open=true`,
      headers: {
        Authorization: `Bearer ${this.intercomTeam.token}`,
        Accept: "application/json",
      },
    };
  }

  getNotSnoozedOpenTickets(): number {
    if (!this.tickets?.conversations) {
      return 0;
    }

    let ticketCount = this.tickets.conversations.length;
    let snoozed = this.tickets.conversations.filter(
      (entry) => entry.state === "snoozed"
    ).length;
    return ticketCount - snoozed;
  }

  getSnoozedOpenTickets() {
    return this.tickets.conversations.filter(
      (entry) => entry.state === "snoozed"
    ).length;
  }

  ticket(count) {
    return count === 0 || count > 1 ? "tickets" : "ticket";
  }

  getText(): string {
    let ticketCount = this.getNotSnoozedOpenTickets();
    let ticketSnoozeCount = this.getSnoozedOpenTickets();
    let inboxName = this.intercomTeam.inboxName;

    let part1 = "";

    switch (true) {
      case ticketCount >= 6:
        part1 = `${inboxName} is on 🔥🔥`;
        break;
      case ticketCount >= 4:
        part1 = `${inboxName} looks a bit busy`;
        break;
      case ticketCount >= 1:
        part1 = `${inboxName} looks good`;
        break;
      default:
        part1 = `${inboxName} looks clear! 🙌`;
        break;
    }

    let only = ticketCount <= 3 ? "only " : "";
    let part2 = "";
    if (ticketCount > 0) {
      part2 = `, ${only}${ticketCount} ${this.ticket(ticketCount)} open`;
    }

    let part3 = "";
    if (ticketSnoozeCount > 0) {
      if (ticketCount > 0) {
        part3 = " and";
      }
      part3 += ` ${ticketSnoozeCount} ${this.ticket(
        ticketSnoozeCount
      )} on snooze`;
    }

    let terminator = ticketCount === 0 && ticketSnoozeCount === 0 ? "" : ".";

    return part1 + part2 + part3 + terminator;
  }
}
export class IntercomClient extends IIntercomBaseClient
  implements IIntercomClient {
  async fetchOpenTickets() {
    try {
      let response = await axios.request(this.makePayload());
      this.tickets = response.data;
    } catch (e) {
      this.context.log("Something failed while communicating with Intercom");
      this.context.log(e);
    }
  }
}
