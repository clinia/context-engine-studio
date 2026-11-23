import "server-only";

import {
  createModelFactory,
  defineRoles,
  StaticModelRegistry,
  type ModelFactory,
} from "@clinia/ai";
import type { RegistryDefinitionInput } from "@clinia/ai/config";

const studioRoles = defineRoles({
  chat: { kind: "language" },
});

export type StudioRole = keyof typeof studioRoles;

export type StudioModels = ModelFactory<typeof studioRoles>;

type RoleBindingInput = NonNullable<RegistryDefinitionInput["roles"]>[string];

export type StudioRegistryDefinition = RegistryDefinitionInput & {
  roles: Record<StudioRole, RoleBindingInput>;
};

const ANTHROPIC = "anthropic";

const DEFAULT_ROLE_BINDINGS = {
  chat: {
    connection: ANTHROPIC,
    model: "claude-opus-4-8",
    settings: { provider_options: { anthropic: { thinking: { type: "adaptive" } } } },
  },
} as const satisfies Record<StudioRole, RoleBindingInput>;

/** Every studio role on its default model, over one Anthropic connection. */
export function defaultRegistryDefinition({
  anthropicApiKey,
}: {
  anthropicApiKey: string;
}): StudioRegistryDefinition {
  return {
    connections: { [ANTHROPIC]: { kind: "anthropic", api_key: anthropicApiKey } },
    roles: DEFAULT_ROLE_BINDINGS,
  };
}

/** Rejects on an invalid definition. */
export async function createStudioModels(
  definition: StudioRegistryDefinition,
): Promise<StudioModels> {
  return createModelFactory({ roles: studioRoles, registry: new StaticModelRegistry(definition) });
}
