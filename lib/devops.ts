import { DevOpsResponse, PullRequest } from "./models/devOpsResponse";
import { IDevOpsTeam } from "../config/config";
import { IContext } from "./context";

let moment = require("moment-timezone");
const axios = require("axios").default;

export interface IDevOpsClient {
  fetchPullRequests(): Promise<any>;

  findPRsWithNoVote(filterList: boolean);

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

  filterPRs(devOpsResponse: DevOpsResponse): DevOpsResponse {
    if (!this.devOpsTeam.filters) {
      return devOpsResponse;
    }

    const result = { ...devOpsResponse };
    result.value = [];

    for (let PR of devOpsResponse.value) {
      let filterHit = false;
      for (let filter of this.devOpsTeam.filters) {
        let regex = RegExp(filter);
        if (regex.test(PR.title)) {
          this.context.log(`PR hit filter, filtering… ${PR.title}`);
          filterHit = true;
        }
      }

      if (!filterHit) {
        result.value.push(PR);
      }
    }

    result.count = result.value.length;
    return result;
  }

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
    let openedTodayCount = this.findPRsOpenedToday();
    let closedTodayCount = this.findPRsClosedToday();
    let filteredNoReviewPRsList = this.findPRsWithNoVote();
    let noReviewCount = filteredNoReviewPRsList.length;

    if (
      noReviewCount === 0 &&
      openedTodayCount === 0 &&
      closedTodayCount === 0
    ) {
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

    if (openedTodayCount === 0 && closedTodayCount === 0) {
      firstPart += ".";
    } else {
      firstPart += ", ";
    }

    let secondPart = "";
    if (openedTodayCount > 0 || closedTodayCount > 0) {
      secondPart = `${openedTodayCount} ${this.pr(
        openedTodayCount
      )} ${this.wasWere(openedTodayCount)} created`;

      if (closedTodayCount > 0) {
        secondPart += ` and ${closedTodayCount} ${this.pr(
          closedTodayCount
        )} ${this.wasWere(closedTodayCount)} closed`;
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
    this.pullRequests = this.filterPRs(await this.fetchPullRequestsInternal());
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
