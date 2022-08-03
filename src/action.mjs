import core from '@actions/core';

const ethereum = core.getInput('ethereum', { required: true });

core.info(`Output to the actions build log: ${ethereum}`);
