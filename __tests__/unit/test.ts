import { Motivatron } from "../../motivatron";
import { IContext } from "../../lib/context";
import { DevOpsClient } from "../../lib/devops";
import { IntercomClient } from "../../lib/intercom";
import { SlackClient } from "../../lib/slack";

const fs = require("fs");
describe("Weird", function () {
  let testContext: IContext = {
    log(message: string) {
      console.log(message);
    },
  };

  let config = JSON.parse(fs.readFileSync("./__tests__/fixtures/config.json"));

  beforeEach(() => {
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

  it("adds 1 + 2 to equal 3", async function () {
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
