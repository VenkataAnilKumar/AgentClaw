import type { Artifact, HumanGateRequest } from '@agentclaw/shared';

export function formatArtifactsAsBlocks(artifacts: Artifact[]) {
  return artifacts.flatMap((artifact) => {
    const content = truncate(artifact.content, 3000);
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: truncate(artifact.title, 140),
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: content,
        },
      },
    ];
  });
}

export function formatGateBlock(gateId: string, gate: HumanGateRequest) {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Approval Required (${gate.type})*\n*${gate.title}*\n${gate.description}`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          style: 'primary',
          text: { type: 'plain_text', text: 'Approve' },
          action_id: 'gate_approve',
          value: gateId,
        },
        {
          type: 'button',
          style: 'danger',
          text: { type: 'plain_text', text: 'Reject' },
          action_id: 'gate_reject',
          value: gateId,
        },
      ],
    },
  ];
}

function truncate(value: string, maxLen: number): string {
  return value.length > maxLen ? `${value.slice(0, maxLen)}...` : value;
}
