import { DevOpsResponse } from "./models/devOpsResponse";
import { IDevOpsTeam } from "../config/config";
import { IContext } from "./context";

let moment = require("moment-timezone");
const axios = require("axios").default;

export interface IDevOpsClient {
  fetchPullRequests(): Promise<any>;

  findPRsWithNoVote();

  PRsToURLList(): string;

  getTextVSTS(): string;

  pr(count: number): string;

  isAre(count: number): string;

  wasWere(count: number): string;

  numberOfPRs(): any;

  findPRsReviewedToday(payload): void;

  findPRsOpenedToday(): any;

  findPRsClosedToday(): any;

  sameDay(date1: Date, date2: Date): any;
}
export abstract class DevOpsBaseClient implements IDevOpsClient {
  protected devOpsTeam: IDevOpsTeam;
  protected context: IContext;
  pullRequests: DevOpsResponse;
  //closedPullRequests: DevOpsResponse;

  constructor(context: IContext, devOpsTeam: IDevOpsTeam) {
    this.context = context;
    this.devOpsTeam = devOpsTeam;
  }

  abstract async fetchPullRequests(): Promise<any>;

  findPRsWithNoVote() {
    let payload = this.pullRequests;
    let relevantPRs = [];
    payload.value.forEach((pr) => {
      let reviewers = pr.reviewers;
      reviewers.forEach((reviewer) => {
        if (
          reviewer.id === this.devOpsTeam.team &&
          reviewer.vote === 0 &&
          !pr.isDraft
        ) {
          relevantPRs.push(pr);
        }
      });
    });
    return relevantPRs;
  }

  PRsToURLList() {
    let prs = this.findPRsWithNoVote();
    if (!prs || !Array.isArray(prs)) {
      return "";
    }

    let result = "";
    for (let pr of prs) {
      result =
        result +
        `- https://dev.azure.com/${this.devOpsTeam.collection}/${this.devOpsTeam.project}/_git/${this.devOpsTeam.repository}/pullrequest/${pr.pullRequestId}: ${pr.title}\n`;
    }

    if (result !== "") {
      result = "\n" + result;
    }
    return result;
  }

  getTextVSTS() {
    let openedToday = this.findPRsOpenedToday();
    let closedToday = this.findPRsClosedToday();
    let noReviewPRs = this.findPRsWithNoVote();
    let noReviewCount = noReviewPRs.length;

    if (noReviewCount === 0 && openedToday === 0 && closedToday === 0) {
      return "🌵 There is nothing todo on VSTS. Woot?";
    }

    let firstPart = "";
    if (noReviewCount === 0) {
      firstPart = `No ${this.pr(noReviewCount)} ${this.isAre(
        noReviewCount
      )} waiting for review`;
    } else {
      firstPart = `${noReviewCount} ${this.pr(noReviewCount)} ${this.isAre(
        noReviewCount
      )} waiting for review`;
    }

    if (openedToday === 0 && closedToday === 0) {
      firstPart += ".";
    } else {
      firstPart += ", ";
    }

    let secondPart = "";
    if (openedToday > 0 || closedToday > 0) {
      secondPart = `${openedToday} ${this.pr(openedToday)} ${this.wasWere(
        openedToday
      )} created`;

      if (closedToday > 0) {
        secondPart += ` and ${closedToday} ${this.pr(
          closedToday
        )} ${this.wasWere(closedToday)} closed`;
      }
      secondPart = secondPart ? (secondPart += " today.") : secondPart;
    }
    return firstPart + secondPart;
  }

  pr(count: number) {
    return count === 0 || count > 1 ? "PRs" : "PR";
  }

  isAre(count: number) {
    return count === 0 || count > 1 ? "are" : "is";
  }

  wasWere(count: number) {
    return count === 0 || count > 1 ? "were" : "was";
  }

  numberOfPRs() {
    let payload = this.pullRequests;
    return payload.count;
  }

  findPRsReviewedToday(payload) {
    // API missing, reviewers does not have a date :(
  }

  findPRsOpenedToday() {
    let payload = this.pullRequests;
    let result = payload.value.filter(
      (pr) =>
        pr.creationDate &&
        this.sameDay(new Date(pr.creationDate), new Date()) &&
        !pr.isDraft
    );
    return result.length;
  }

  findPRsClosedToday() {
    let payload = this.pullRequests;
    let result = payload.value.filter(
      (pr) =>
        pr.closedDate &&
        this.sameDay(new Date(pr.closedDate), new Date()) &&
        !pr.isDraft
    );
    return result.length;
  }

  sameDay(date1: Date, date2: Date) {
    return moment(date1)
      .tz("America/Los_Angeles")
      .isSame(moment(date2).tz("America/Los_Angeles"), "day");
  }
}
export class DevOpsClient extends DevOpsBaseClient implements IDevOpsClient {
  async fetchPullRequests() {
    this.pullRequests = await this.fetchPullRequestsInternal();
    //this.closedPullRequests = await this.fetchPullRequestsInternal(true);
  }

  public async fetchPullRequestsInternal(
    closed = false
  ): Promise<DevOpsResponse> {
    let url =
      "https://something:" +
      this.devOpsTeam.token +
      `@dev.azure.com/${this.devOpsTeam.collection}/${this.devOpsTeam.project}/_apis/git/repositories/${this.devOpsTeam.repository}/pullrequests?api-version=4.1`;
    let params = `&searchCriteria.reviewerId=${this.devOpsTeam.team}&top=1000`;
    let params2 = closed
      ? "&searchCriteria.status=closed"
      : "&searchCriteria.status=active";

    let options = {
      json: true,
      url: url + params + params2,
    };

    try {
      return (await axios.request(options)).data;
    } catch (e) {
      this.context.log("Something failed while sending a message to DevOps!");
      this.context.log(e);
    }
  }
}
