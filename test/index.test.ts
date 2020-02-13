import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import * as lib from "../lib";

test("can read from output directory after running start script", () => {
  const stdout = execSync("npm start");
  expect.assertions(2);
  expect(Buffer.from(stdout).length).not.toBe(0);
  expect(async () => {
    await fs.promises.access(
      path.join(process.cwd(), "output"),
      fs.constants.R_OK
    );
  }).not.toThrow();
});

test("interaction model generation fails when given bad project data", () => {
  expect.assertions(1);
  expect(() => {
    lib.mapProjectDataToInteractionModel([]);
  }).toThrow();
});

test.todo("writes interaction model");
test.todo("warns in the case of node.js version below minimum");

test.skip("creates directory named from provided command line flag", () => {
  execSync("npm start model");
  expect.assertions(1);
  expect(async () => {
    await fs.promises.access(
      path.join(process.cwd(), "model"),
      fs.constants.R_OK
    );
  }).not.toThrow();
});
