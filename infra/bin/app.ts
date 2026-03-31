#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { SnapVaultStack } from "../lib/snapvault-stack";

const app = new cdk.App();

new SnapVaultStack(app, "SnapVaultStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
  description: "SnapVault — Ultra-cheap personal photo/video cloud storage",
});
