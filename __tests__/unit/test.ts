import { Motivatron } from "../../motivatron";
import { IContext } from "../../lib/context";
import { DevOpsClient } from "../../lib/devops";
import { IntercomClient } from "../../lib/intercom";
import { SlackClient } from "../../lib/slack";
import { IConfig } from "../../config/config";
import { DevOpsResponse, PullRequest } from "../../lib/models/devOpsResponse";

const fs = require("fs");
describe("Unit Tests", function () {
  let testContext: IContext = {
    log(message: string) {
      console.log(message);
    },
  };

  let config: IConfig;

  beforeEach(() => {
    // Reset config
    config = JSON.parse(fs.readFileSync("./__tests__/fixtures/config.json"));

    // Explaination: https://stackoverflow.com/questions/49652411/jest-mock-individual-function-from-es6-class
    // Note: This can not be an arrow function. This makes sure `this` will be bound to the current instance.

    SlackClient.prototype.sendToSlack = jest
      .fn()
      .mockImplementation(function (message) {
        let options = this.makePayload(message);
        console.log("Sending to Slack:");
        console.log(options);
      });

    IntercomClient.prototype.fetchOpenTickets = async function () {
      console.log("Using mock IntercomClient");
      this.tickets = require("../fixtures/intercom.json");
    };

    DevOpsClient.prototype.fetchPullRequests = async function () {
      console.log("Using mock DevOpsBaseClient");
      let fixture = require("../fixtures/devops.json");
      this.pullRequests = fixture;
      //this.closedPullRequests = fixture;
      return fixture;
    };
  });

  function MakePRsPayloadWithThoseNames(names: string[]) {
    // use the base fixture
    let fixture: DevOpsResponse = require("../fixtures/devops.json");

    // get base PR
    let basePR: PullRequest = fixture.value[0];

    let result: DevOpsResponse = {
      value: [],
      count: names.length,
    };

    // Loop, randomize ID and give it a name
    for (let name of names) {
      let newPR: PullRequest = {
        ...basePR,
        pullRequestId: Math.floor(Math.random() * Math.floor(10000000)),
        title: name,
      };
      result.value.push(newPR);
    }

    return result;
  }

  describe("Filtering", function () {
    let team;
    let PRs;

    beforeEach(() => {
      team = config.teams[0].devOpsTeams[0];

      PRs = MakePRsPayloadWithThoseNames([
        "Pull Request 1",
        "Pull Request 2",
        "[aks] Update nginx-ingress-controller to version 0.32.0 in somewhere",
        "Somewhere [aks] Update nginx-ingress-controller to version 0.32.0 in somewhere",
        "Dependabot: Update 19 dependencies in /something/bla",
      ]);
    });

    it("dont fail if filters are null", function () {
      team.filters = null;
      let filteredPRs = new DevOpsClient(testContext, team).filterPRs(PRs);

      expect(filteredPRs.value.length).toBe(PRs.value.length);
    });

    it("dont fail if filters are undefined", function () {
      team.filters = null;
      let filteredPRs = new DevOpsClient(testContext, team).filterPRs(PRs);

      expect(filteredPRs.value.length).toBe(PRs.value.length);
    });

    it("should not filters anything", function () {
      team.filters = [];
      let filteredPRs = new DevOpsClient(testContext, team).filterPRs(PRs);

      expect(filteredPRs.value.length).toBe(PRs.value.length);
    });

    it("should filter one", function () {
      team.filters = [/^(\[aks])/];
      let filteredPRs = new DevOpsClient(testContext, team).filterPRs(PRs);

      expect(filteredPRs.value.length).toBe(
        PRs.value.length - team.filters.length
      );
    });

    it("should filter both", function () {
      team.filters = [/^(\[aks])/, /^(Dependabot)/];
      let filteredPRs = new DevOpsClient(testContext, team).filterPRs(PRs);

      expect(filteredPRs.value.length).toBe(
        PRs.value.length - team.filters.length
      );
    });

    it("should filter multiple times", function () {
      team.filters = [/^(Pull )/];
      let filteredPRs = new DevOpsClient(testContext, team).filterPRs(PRs);

      expect(filteredPRs.value.length).toBe(3);
    });
  });

  it("should generate what we expect", async function () {
    let slackSpy = jest.spyOn(SlackClient.prototype, "sendToSlack");

    let motivatron = new Motivatron(testContext, config);
    await motivatron.doThings();

    expect(slackSpy).toBeCalledTimes(2);
    expect(slackSpy).toHaveBeenNthCalledWith(
      1,
      "1 PR is waiting for review. Team #1 Inbox looks clear! 🙌 2 tickets on snooze.\n- https://dev.azure.com/collection/project/_git/repository/pullrequest/43628: PR Title\n"
    );

    expect(slackSpy).toHaveBeenNthCalledWith(
      2,
      "1 PR is waiting for review. Inbox 1 looks clear! 🙌 2 tickets on snooze. Inbox 2 looks clear! 🙌 2 tickets on snooze.\n- https://dev.azure.com/collection/project/_git/repository/pullrequest/43628: PR Title\n"
    );
  });
});
