import type { MessageFile } from "$lib/types/Message";
import {
	type MessageUpdate,
	type MessageToolCallUpdate,
	MessageToolUpdateType,
	MessageUpdateType,
	MessageUpdateStatus,
	type MessageToolUpdate,
	type MessageWebSearchUpdate,
	type MessageWebSearchGeneralUpdate,
	type MessageWebSearchSourcesUpdate,
	type MessageWebSearchErrorUpdate,
	MessageWebSearchUpdateType,
	type MessageToolErrorUpdate,
	type MessageToolResultUpdate,
} from "$lib/types/MessageUpdate";

export const isMessageWebSearchUpdate = (update: MessageUpdate): update is MessageWebSearchUpdate =>
	update.type === MessageUpdateType.WebSearch;
export const isMessageWebSearchGeneralUpdate = (
	update: MessageUpdate
): update is MessageWebSearchGeneralUpdate =>
	isMessageWebSearchUpdate(update) && update.subtype === MessageWebSearchUpdateType.Update;
export const isMessageWebSearchSourcesUpdate = (
	update: MessageUpdate
): update is MessageWebSearchSourcesUpdate =>
	isMessageWebSearchUpdate(update) && update.subtype === MessageWebSearchUpdateType.Sources;
export const isMessageWebSearchErrorUpdate = (
	update: MessageUpdate
): update is MessageWebSearchErrorUpdate =>
	isMessageWebSearchUpdate(update) && update.subtype === MessageWebSearchUpdateType.Error;

export const isMessageToolUpdate = (update: MessageUpdate): update is MessageToolUpdate =>
	update.type === MessageUpdateType.Tool;
export const isMessageToolCallUpdate = (update: MessageUpdate): update is MessageToolCallUpdate =>
	isMessageToolUpdate(update) && update.subtype === MessageToolUpdateType.Call;
export const isMessageToolResultUpdate = (
	update: MessageUpdate
): update is MessageToolResultUpdate =>
	isMessageToolUpdate(update) && update.subtype === MessageToolUpdateType.Result;
export const isMessageToolErrorUpdate = (update: MessageUpdate): update is MessageToolErrorUpdate =>
	isMessageToolUpdate(update) && update.subtype === MessageToolUpdateType.Error;

type MessageUpdateRequestOptions = {
	base: string;
	inputs?: string;
	messageId?: string;
	isRetry: boolean;
	isContinue: boolean;
	webSearch: boolean;
	tools?: Array<string>;
	files?: MessageFile[];
};
export async function fetchMessageUpdates(
	conversationId: string,
	opts: MessageUpdateRequestOptions,
	abortSignal: AbortSignal
): Promise<AsyncGenerator<MessageUpdate>> {
	const abortController = new AbortController();
	abortSignal.addEventListener("abort", () => abortController.abort());

	const form = new FormData();

	const optsJSON = JSON.stringify({
		inputs: opts.inputs,
		id: opts.messageId,
		is_retry: opts.isRetry,
		is_continue: opts.isContinue,
		web_search: opts.webSearch,
		tools: opts.tools,
	});

	opts.files?.forEach((file) => {
		const name = file.type + ";" + file.name;

		form.append("files", new File([file.value], name, { type: file.mime }));
	});

	form.append("data", optsJSON);

	const response = await fetch(
		`http://localhost:8000/ask`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				question: opts.inputs || "¿Cuál es la película donde los humanos luchan contra IA?",
			}),
			signal: abortController.signal,
		}
	);

	if (!response.ok) {
		const errorMessage = await response
			.json()
			.then((obj) => obj.message || obj.error || "Error en la API")
			.catch(() => `Request failed with status code ${response.status}: ${response.statusText}`);
		throw Error(errorMessage);
	}

	return processCustomAPIResponse(response, abortController);
}

async function* processCustomAPIResponse(
	response: Response,
	abortController: AbortController
): AsyncGenerator<MessageUpdate> {
	try {
		const data = await response.json();

		yield {
			type: MessageUpdateType.Stream,
			token: "Buscando películas...",
		};

		await new Promise((resolve) => setTimeout(resolve, 500));

		let responseText = `\n\n**${data.answer}**\n\n`;

		if (data.results && data.results.length > 0) {
			const movie = data.results[0];
			responseText += `### ${movie.title}\n\n`;
			responseText += `![${movie.title}](${movie.image})\n\n`;
			responseText += `${movie.content}\n\n`;
			//responseText += `*Similitud: ${(movie.similarity * 100).toFixed(1)}%*`;
		}

		const words = responseText.split(" ");

		for (let i = 0; i < words.length; i++) {
			if (abortController.signal.aborted) break;

			yield {
				type: MessageUpdateType.Stream,
				token: words[i] + (i < words.length - 1 ? " " : ""),
			};

			await new Promise((resolve) => setTimeout(resolve, 80));
		}

		yield {
			type: MessageUpdateType.Status,
			status: MessageUpdateStatus.Finished,
		};
	} catch (error) {
		yield {
			type: MessageUpdateType.Status,
			status: MessageUpdateStatus.Error,
			message: "Error procesando respuesta: " + (error as Error).message,
		};
	}
}
