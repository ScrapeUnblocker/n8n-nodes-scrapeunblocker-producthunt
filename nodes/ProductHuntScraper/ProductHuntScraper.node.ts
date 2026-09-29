import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type { OptionField } from './GenericFunctions';
import { applyOptions, requireString, runActorAndGetItems } from './GenericFunctions';

// ScrapeUnblocker's public "Product Hunt Scraper" Actor: https://apify.com/scrapeunblocker/producthunt-scraper
const ACTOR_ID = '0sCWbUmcz2qd52Tja';
const INTEGRATION_APP_ID = 'scrapeunblocker-producthunt-scraper';

// Node option name -> Actor input key.
const OPTION_FIELDS: Record<string, OptionField> = {
	date: {
		key: 'date',
	},
	proxyCountry: {
		key: 'proxy_country',
		kind: 'upper',
	},
};

function buildActorInput(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	options: IDataObject,
	itemIndex: number,
): IDataObject {
	const input: IDataObject = {};

	switch (`${resource}:${operation}`) {
		case 'product:getLeaderboard': {
			input.max_results = this.getNodeParameter('maxResults', itemIndex);
			input.mode = 'leaderboard';
			break;
		}
		case 'product:search': {
			input.query = requireString.call(this, 'query', 'Search Query', itemIndex);
			input.max_results = this.getNodeParameter('maxResults', itemIndex);
			input.mode = 'search';
			break;
		}
		case 'product:getByTopic': {
			input.topic = requireString.call(this, 'topic', 'Topic', itemIndex);
			input.max_results = this.getNodeParameter('maxResults', itemIndex);
			input.mode = 'topic';
			break;
		}
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported for resource "${resource}"`,
				{ itemIndex },
			);
	}

	applyOptions(input, options, OPTION_FIELDS);
	return input;
}

export class ProductHuntScraper implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Product Hunt Scraper',
		name: 'productHuntScraper',
		icon: {
			light: 'file:productHuntScraper.png',
			dark: 'file:productHuntScraper.dark.png',
		},
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Get Product Hunt leaderboards, search results and topic pages with the ScrapeUnblocker Actor on Apify',
		defaults: {
			name: 'Product Hunt Scraper',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'apifyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Product',
						value: 'product',
					},
				],
				default: 'product',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['product'],
					},
				},
				options: [
					{
						name: 'Get Leaderboard',
						value: 'getLeaderboard',
						description: "Get a day's ranked launches from the Product Hunt leaderboard",
						action: 'Get leaderboard products',
					},
					{
						name: 'Get by Topic',
						value: 'getByTopic',
						description: 'Get the products listed under a Product Hunt topic',
						action: 'Get products by topic',
					},
					{
						name: 'Search',
						value: 'search',
						description: 'Search Product Hunt products by keyword',
						action: 'Search products',
					},
				],
				default: 'getLeaderboard',
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 20,
				description: 'How many products to collect',
				displayOptions: {
					show: {
						resource: ['product'],
						operation: ['getLeaderboard'],
					},
				},
			},
			{
				displayName: 'Search Query',
				name: 'query',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'note taking',
				description: 'What to search for on Product Hunt',
				displayOptions: {
					show: {
						resource: ['product'],
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 20,
				description: 'How many products to collect',
				displayOptions: {
					show: {
						resource: ['product'],
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Topic',
				name: 'topic',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'artificial-intelligence',
				description:
					"Topic slug as in the topic page URL, e.g. 'artificial-intelligence' for producthunt.com/topics/artificial-intelligence",
				displayOptions: {
					show: {
						resource: ['product'],
						operation: ['getByTopic'],
					},
				},
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 20,
				description: 'How many products to collect',
				displayOptions: {
					show: {
						resource: ['product'],
						operation: ['getByTopic'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Date',
						name: 'date',
						type: 'string',
						default: '',
						placeholder: '2025-01-15',
						description: 'Leaderboard day as YYYY-MM-DD, e.g. 2025-01-15. Leave empty for today.',
						displayOptions: {
							show: {
								'/operation': ['getLeaderboard'],
							},
						},
					},
					{
						displayName: 'Proxy Country',
						name: 'proxyCountry',
						type: 'string',
						default: '',
						placeholder: 'US',
						description: 'Exit-IP country (ISO-2, e.g. US). Leave empty for automatic choice.',
					},
					{
						displayName: 'Timeout (Seconds)',
						name: 'timeout',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description:
							'Maximum run time of the Apify Actor run. 0 keeps the Actor default. A run that times out fails the node.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const options = this.getNodeParameter('options', i, {}) as IDataObject;
				const { timeout, ...actorOptions } = options;

				const input = buildActorInput.call(this, resource, operation, actorOptions, i);
				const { items: results } = await runActorAndGetItems.call(this, {
					actorId: ACTOR_ID,
					integrationAppId: INTEGRATION_APP_ID,
					input,
					itemIndex: i,
					timeoutSecs: (timeout as number) || undefined,
				});

				for (const result of results) {
					returnData.push({ json: result, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Both constructors return an error of their own class unchanged.
				if (error instanceof NodeApiError) {
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i });
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
