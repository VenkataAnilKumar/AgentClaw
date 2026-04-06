#!/usr/bin/env node

import { Command } from 'commander';
import { registerInstallCommand } from './commands/install.js';
import { registerDoctorCommand } from './commands/doctor.js';
import { registerInitCommand } from './commands/init.js';

const program = new Command();

program
  .name('agentclaw')
  .description('AgentClaw CLI — manage your AI agent workspace')
  .version('0.1.0');

registerInstallCommand(program);
registerDoctorCommand(program);
registerInitCommand(program);

program.parse();
