import type {
  ChatModel,
  ChatAgent,
  ChatAssistant,
  KnowledgeBase,
  ChatSession,
  ChatResource,
  PageResult,
} from '@/types'
import { useRequest } from '@/composables/useRequest'
import { buildQuery } from './query'

// ================================================
// 聊天模型 API
// ================================================
export const chatModelApi = {
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    modelName?: string
    status?: string
    projectId?: string
  }) => {
    return useRequest<PageResult<ChatModel>>(`/ai/chat/models/page${buildQuery(params)}`).json()
  },

  getById: (id: string) => {
    return useRequest<ChatModel>(`/ai/chat/models/${id}`).json()
  },

  create: (data: Partial<ChatModel>) => {
    return useRequest('/ai/chat/models', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<ChatModel>) => {
    return useRequest(`/ai/chat/models/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/ai/chat/models/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// 智能体 API
// ================================================
export const chatAgentApi = {
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    agentName?: string
    status?: string
    projectId?: string
    knowledgeBaseId?: string
  }) => {
    return useRequest<PageResult<ChatAgent>>(`/ai/chat/agents/page${buildQuery(params)}`).json()
  },

  getById: (id: string) => {
    return useRequest<ChatAgent>(`/ai/chat/agents/${id}`).json()
  },

  create: (data: Partial<ChatAgent>) => {
    return useRequest('/ai/chat/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<ChatAgent>) => {
    return useRequest(`/ai/chat/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/ai/chat/agents/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// 助手 API
// ================================================
export const chatAssistantApi = {
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    assistantName?: string
    status?: string
    projectId?: string
    knowledgeBaseId?: string
  }) => {
    return useRequest<PageResult<ChatAssistant>>(`/ai/chat/assistants/page${buildQuery(params)}`).json()
  },

  getById: (id: string) => {
    return useRequest<ChatAssistant>(`/ai/chat/assistants/${id}`).json()
  },

  create: (data: Partial<ChatAssistant>) => {
    return useRequest('/ai/chat/assistants', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<ChatAssistant>) => {
    return useRequest(`/ai/chat/assistants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/ai/chat/assistants/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// 知识库 API
// ================================================
export const knowledgeBaseApi = {
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    baseName?: string
    status?: string
    projectId?: string
  }) => {
    return useRequest<PageResult<KnowledgeBase>>(`/ai/knowledge/page${buildQuery(params)}`).json()
  },

  getById: (id: string) => {
    return useRequest<KnowledgeBase>(`/ai/knowledge/${id}`).json()
  },

  create: (data: Partial<KnowledgeBase>) => {
    return useRequest('/ai/knowledge', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<KnowledgeBase>) => {
    return useRequest(`/ai/knowledge/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/ai/knowledge/${id}`, { method: 'DELETE' }).json()
  },

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
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    title?: string
    sessionType?: string
    aiId?: string
  }) => {
    return useRequest<PageResult<ChatSession>>(`/ai/chat/sessions/page${buildQuery(params)}`).json()
  },

  getById: (id: string) => {
    return useRequest<ChatSession>(`/ai/chat/sessions/${id}`).json()
  },

  create: (data: Partial<ChatSession>) => {
    return useRequest('/ai/chat/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<ChatSession>) => {
    return useRequest(`/ai/chat/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/ai/chat/sessions/${id}`, { method: 'DELETE' }).json()
  },

  getMessages: (id: string) => {
    return useRequest<any[]>(`/ai/chat/sessions/${id}/messages`).json()
  },
}

// ================================================
// 会话资源 API
// ================================================
export const chatResourceApi = {
  list: (sessionId: string, params?: {
    pageNumber?: number
    pageSize?: number
    fileId?: string
  }) => {
    return useRequest<PageResult<ChatResource>>(`/ai/chat/sessions/${sessionId}/resources/page${buildQuery(params)}`).json()
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
