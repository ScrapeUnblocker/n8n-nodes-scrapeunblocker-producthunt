import { ProductHuntScraper } from './nodes/ProductHuntScraper/ProductHuntScraper.node';
import { ApifyApi } from './credentials/ApifyApi.credentials';

export const nodeTypes = [ProductHuntScraper];

export const credentialTypes = [ApifyApi];
