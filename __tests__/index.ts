import { execSync } from "child_process";
import { join } from "path";
import fs from "fs";
import * as lib from "../lib";

test("can read from output directory after running start script", () => {
  const stdout = execSync("npm start");
  expect.assertions(2);
  expect(Buffer.from(stdout).length).not.toBe(0);
  expect(async () => {
    await fs.promises.access(join(process.cwd(), "output"), fs.constants.R_OK);
  }).not.toThrow();
});

test("produces interaction model from project data", () => {
  expect.assertions(1);
  expect(() => {
    lib.mapProjectDataToInteractionModel([]);
  }).toThrow();
});

test("creates directory named from provided command line flag", () => {
  execSync("npm start model");
  expect.assertions(1);
  expect(async () => {
    await fs.promises.access(join(process.cwd(), "model"), fs.constants.R_OK);
  }).not.toThrow();
});
