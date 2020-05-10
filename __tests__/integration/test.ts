import { Motivatron } from "../../motivatron";
import { IContext } from "../../lib/context";
import { DevOpsClient } from "../../lib/devops";
import { IntercomClient } from "../../lib/intercom";
import { SlackClient } from "../../lib/slack";

const fs = require("fs");
describe("Integration Tests", function () {
  let testContext: IContext = {
    log(message: string) {
      console.log(message);
    },
  };

  let config = JSON.parse(fs.readFileSync("./config.json"));

  beforeEach(() => {
    SlackClient.prototype.sendToSlack = jest
      .fn()
      .mockImplementation(function (message) {
        let options = this.makePayload(message);
        console.log("Sending to Slack:");
        console.log(options);
      });
  });

  it("should roll be able to fetch all the things", async function () {
    let slackSpy = jest.spyOn(SlackClient.prototype, "sendToSlack");

    let motivatron = new Motivatron(testContext, config);
    await motivatron.doThings();
  });
});
