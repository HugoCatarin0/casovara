import { designTools, plannerGuide, runDesignTool } from './plan-agent.js';

export function registerBuilderTools({ registry = document.modelContext ?? navigator.modelContext, locale,
  getProject, stage, signal }) {
  if (typeof registry?.registerTool !== 'function') return;
  const ownerSignal = signal;
  function register(tool) {
    try {
      Promise.resolve(registry.registerTool(tool, { signal: ownerSignal })).catch(() => {});
    } catch {
      // The ordinary planner stays usable when the experimental registry is unavailable.
    }
  }
  register({
    name: 'casovara_get_planner_skill',
    title: 'Casovara drawing guide',
    description: 'Learn the geometry and workflow for the Casovara tools, including meters, stable IDs and how drafts are reviewed.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: () => ({ guide: plannerGuide }),
  });
  for (const tool of designTools) {
    const inspection = tool.name === 'casovara_inspect_plan';
    register({
      ...tool,
      description: inspection ? tool.description : tool.description + ' In the browser this opens a proposal for the user to review and apply.',
      annotations: { readOnlyHint: inspection, untrustedContentHint: true },
      execute(input, context) {
        if (ownerSignal?.aborted || context?.signal?.aborted) return { error: 'Cancelled.' };
        try {
          const { project, analysis } = runDesignTool(tool.name, input, { project: getProject(), locale });
          if (!project) return { analysis };
          const accepted = stage(project, { analysis, summary: locale === 'pt-PT' ? 'Proposta preparada por uma ferramenta do planeador.' : 'Proposal prepared by a planner tool.' });
          if (!accepted) return { error: 'The editor could not stage this proposal for review.' };
          return { staged: true, analysis };
        } catch (error) {
          return { error: String(error.message).slice(0, 400) };
        }
      },
    });
  }
}
