import { describe, expect, it } from "vitest";
import { createStudioModels, defaultRegistryDefinition } from "./studio-models";

describe("createStudioModels", () => {
  it("binds the chat role to its default model", async () => {
    const models = await createStudioModels(defaultRegistryDefinition({ anthropicApiKey: "test" }));

    const chat = models.languageModel("chat");

    expect(chat.provider).toMatch(/^anthropic/);
    expect(chat.modelId).toBe("claude-opus-4-8");
  });

  it("rejects a role bound to an undeclared connection", async () => {
    const definition = defaultRegistryDefinition({ anthropicApiKey: "test" });

    await expect(createStudioModels({ ...definition, connections: {} })).rejects.toThrow(
      /unknown connection "anthropic"/,
    );
  });
});
