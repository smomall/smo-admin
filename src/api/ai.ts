import type {
  ChatModel,
  ChatAgent,
  ChatAssistant,
  KnowledgeBase,
  ChatSession,
  ChatResource,
  ChatMessage,
  PageResult,
} from '@/types'
import { useRequest } from '@/composables/useRequest'
import { buildQuery } from './query'
import { createCrudApi } from './factory'

// ================================================
// 聊天模型 API
// ================================================
export const chatModelApi = {
  ...createCrudApi<ChatModel, { modelName?: string; status?: string; projectId?: string }>(
    '/ai/chat/models',
  ),
}

// ================================================
// 智能体 API
// ================================================
export const chatAgentApi = {
  ...createCrudApi<ChatAgent, {
    agentName?: string
    status?: string
    projectId?: string
    knowledgeBaseId?: string
  }>('/ai/chat/agents'),
}

// ================================================
// 助手 API
// ================================================
export const chatAssistantApi = {
  ...createCrudApi<ChatAssistant, {
    assistantName?: string
    status?: string
    projectId?: string
    knowledgeBaseId?: string
  }>('/ai/chat/assistants'),
}

// ================================================
// 知识库 API
// ================================================
export const knowledgeBaseApi = {
  ...createCrudApi<KnowledgeBase, { baseName?: string; status?: string; projectId?: string }>(
    '/ai/knowledge',
  ),

  upload: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return useRequest(`/ai/knowledge/${id}/upload`, {
      method: 'POST',
      body: formData,
    }).json()
  },
}

// ================================================
// 会话 API
// ================================================
export const chatSessionApi = {
  ...createCrudApi<ChatSession, { title?: string; sessionType?: string; aiId?: string }>(
    '/ai/chat/sessions',
  ),

  getMessages: (id: string) => useRequest<ChatMessage[]>(`/ai/chat/sessions/${id}/messages`).json(),
}

// ================================================
// 会话资源 API（嵌套在会话下，路径为 /ai/chat/sessions/{sessionId}/resources）
// ================================================
export const chatResourceApi = {
  list: (sessionId: string, params?: { pageNumber?: number; pageSize?: number; fileId?: string }) => {
    return useRequest<PageResult<ChatResource>>(
      `/ai/chat/sessions/${sessionId}/resources/page${buildQuery(params)}`,
    ).json()
  },

  getById: (sessionId: string, id: string) => {
    return useRequest<ChatResource>(`/ai/chat/sessions/${sessionId}/resources/${id}`).json()
  },

  create: (sessionId: string, data: Partial<ChatResource>) => {
    return useRequest(`/ai/chat/sessions/${sessionId}/resources`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (sessionId: string, id: string, data: Partial<ChatResource>) => {
    return useRequest(`/ai/chat/sessions/${sessionId}/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (sessionId: string, id: string) => {
    return useRequest(`/ai/chat/sessions/${sessionId}/resources/${id}`, { method: 'DELETE' }).json()
  },
}
