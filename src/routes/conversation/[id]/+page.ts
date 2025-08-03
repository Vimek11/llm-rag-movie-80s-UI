import { useAPIClient, handleResponse } from "$lib/APIClient";
import { UrlDependency } from "$lib/types/UrlDependency";
import { redirect } from "@sveltejs/kit";

export const load = async ({ params, depends, fetch }) => {
	depends(UrlDependency.Conversation);

	const client = useAPIClient({ fetch });

	// MOCK: Comentar la llamada a conversation específica para evitar errores
	/*
	try {
		return await client.conversations({ id: params.id }).get().then(handleResponse);
	} catch {
		redirect(302, "/");
	}
	*/
	
	// Retornar datos mock
	return {
		messages: [],
		title: "Mock Conversation",
		model: "mock-model",
		preprompt: "",
		rootMessageId: "mock-root",
		assistant: undefined,
		id: params.id,
		updatedAt: new Date(),
		modelId: "mock-model",
		assistantId: undefined,
		modelTools: false,
		shared: false,
	};
};
