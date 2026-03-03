import type { HttpClient } from '../client'
import type {
  CreateProjectParams,
  CreateProjectResponse,
  ListProjectsResponse,
} from '../types'

function mapProject(raw: Record<string, unknown>) {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    apiKey: raw.api_key,
    webhookSecret: raw.webhook_secret,
    webhookUrl: raw.webhook_url,
    createdAt: raw.created_at,
  }
}

function mapProjectListItem(raw: Record<string, unknown>) {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    apiKey: raw.api_key,
    webhookUrl: raw.webhook_url,
    isActive: raw.is_active,
    createdAt: raw.created_at,
  }
}

export class Projects {
  constructor(private readonly client: HttpClient) {}

  async create(params: CreateProjectParams): Promise<CreateProjectResponse> {
    const body = {
      name: params.name,
      slug: params.slug,
      webhook_url: params.webhookUrl,
      metadata: params.metadata,
    }

    const raw = await this.client.post<Record<string, unknown>>('/v1/projects', body)
    return {
      success: true,
      project: mapProject(raw.project as Record<string, unknown>),
    } as CreateProjectResponse
  }

  async list(): Promise<ListProjectsResponse> {
    const raw = await this.client.get<Record<string, unknown>>('/v1/projects')
    const projects = raw.projects as Array<Record<string, unknown>>

    return {
      success: true,
      projects: projects.map(mapProjectListItem),
    } as ListProjectsResponse
  }
}
