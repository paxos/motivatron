import { DevOpsResponse, PullRequest } from "./models/devOpsResponse";
import { IDevOpsTeam } from "../config/config";
import { IContext } from "./context";

let moment = require("moment-timezone");
const axios = require("axios").default;

export class DevOpsClient {
  protected devOpsTeam: IDevOpsTeam;
  protected context: IContext;
  pullRequests: DevOpsResponse;
  //closedPullRequests: DevOpsResponse;

  constructor(context: IContext, devOpsTeam: IDevOpsTeam) {
    this.context = context;
    this.devOpsTeam = devOpsTeam;
  }

  filterPRs(pullRequests: PullRequest[]): PullRequest[] {
    if (!Array.isArray(this.devOpsTeam.filters)) {
      return pullRequests;
    }

    const result: PullRequest[] = [];

    for (let pullRequest of pullRequests) {
      let filterHit = false;
      for (let filter of this.devOpsTeam.filters) {
        try {
          let regex = RegExp(filter);
          if (regex.test(pullRequest.title)) {
            this.context.log(`PR hit filter, filtering… ${pullRequest.title}`);
            filterHit = true;
          }
        } catch (error) {
          this.context.log(`Invalid filter ${filter}`);
        }
      }

      if (!filterHit) {
        result.push(pullRequest);
      }
    }

    return result;
  }

  findPRsWithNoVote(payload: DevOpsResponse): PullRequest[] {
    let relevantPRs: PullRequest[] = [];
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
    let pullRequests = this.findPRsWithNoVote(this.pullRequests);
    if (!pullRequests || !Array.isArray(pullRequests)) {
      return "";
    }

    let result = "";
    for (let pullRequest of pullRequests) {
      result =
        result +
        `- https://dev.azure.com/${this.devOpsTeam.collection}/${this.devOpsTeam.project}/_git/${this.devOpsTeam.repository}/pullrequest/${pullRequest.pullRequestId}: ${pullRequest.title}\n`;
    }

    if (result !== "") {
      result = "\n" + result;
    }
    return result;
  }

  getTextVSTS() {
    let openedTodayCount = this.findPRsOpenedToday(this.pullRequests);
    let closedTodayCount = this.findPRsClosedToday(this.pullRequests);
    let noReviewPRsList: PullRequest[] = this.findPRsWithNoVote(
      this.pullRequests
    );
    let filteredNoReviewPRsList: PullRequest[] = this.filterPRs(
      noReviewPRsList
    );

    let filteredPRCount =
      noReviewPRsList.length - filteredNoReviewPRsList.length;

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

    if (filteredPRCount > 0) {
      firstPart += ` (${filteredPRCount} filtered)`;
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

  findPRsOpenedToday(payload: DevOpsResponse) {
    let result = payload.value.filter(
      (pr) =>
        pr.creationDate &&
        this.sameDay(new Date(pr.creationDate), new Date()) &&
        !pr.isDraft
    );
    return result.length;
  }

  findPRsClosedToday(payload: DevOpsResponse) {
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
