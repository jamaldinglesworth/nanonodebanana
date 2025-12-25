import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  type PromptTemplate,
  type TemplateCategory,
  TEMPLATE_CATEGORIES,
  getAllTemplates,
  getTemplatesByCategory,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  searchTemplates,
  extractVariables,
  applyVariables,
} from '../lib/prompt-templates'

interface PromptTemplatesProps {
  isOpen: boolean
  onClose: () => void
  onInsert?: (text: string) => void
}

/**
 * Prompt Templates panel - browse, search, and manage prompt templates.
 * Templates can be dragged onto Prompt nodes or inserted via button.
 */
export function PromptTemplates({ isOpen, onClose, onInsert }: PromptTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all')
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<TemplateCategory>>(new Set())
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null)
  const [variableInputs, setVariableInputs] = useState<Record<string, string>>({})
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Load templates on mount and when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTemplates(getAllTemplates())
      // Expand all categories by default
      setExpandedCategories(new Set(Object.keys(TEMPLATE_CATEGORIES) as TemplateCategory[]))
    }
  }, [isOpen])

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    let result = searchQuery ? searchTemplates(searchQuery) : templates

    if (selectedCategory !== 'all') {
      result = result.filter(t => t.category === selectedCategory)
    }

    return result
  }, [templates, searchQuery, selectedCategory])

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    if (searchQuery || selectedCategory !== 'all') {
      // When searching or filtering, show flat list
      return null
    }
    return getTemplatesByCategory()
  }, [searchQuery, selectedCategory])

  // Toggle category expansion
  const toggleCategory = useCallback((category: TemplateCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  // Handle drag start for template
  const handleDragStart = useCallback((e: React.DragEvent, template: PromptTemplate) => {
    const content = template.variables?.length
      ? applyVariables(template.content, variableInputs)
      : template.content
    e.dataTransfer.setData('text/plain', content)
    e.dataTransfer.setData('application/x-prompt-template', JSON.stringify(template))
    e.dataTransfer.effectAllowed = 'copy'
  }, [variableInputs])

  // Handle template selection
  const handleSelectTemplate = useCallback((template: PromptTemplate) => {
    setSelectedTemplate(template)
    // Initialize variable inputs
    if (template.variables?.length) {
      const inputs: Record<string, string> = {}
      for (const variable of template.variables) {
        inputs[variable] = variableInputs[variable] || ''
      }
      setVariableInputs(inputs)
    }
  }, [variableInputs])

  // Handle insert template
  const handleInsert = useCallback(() => {
    if (!selectedTemplate) return

    const content = selectedTemplate.variables?.length
      ? applyVariables(selectedTemplate.content, variableInputs)
      : selectedTemplate.content

    onInsert?.(content)
    setSelectedTemplate(null)
    setVariableInputs({})
  }, [selectedTemplate, variableInputs, onInsert])

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    if (!selectedTemplate) return

    const content = selectedTemplate.variables?.length
      ? applyVariables(selectedTemplate.content, variableInputs)
      : selectedTemplate.content

    navigator.clipboard.writeText(content)
  }, [selectedTemplate, variableInputs])

  // Handle delete template
  const handleDelete = useCallback((template: PromptTemplate) => {
    if (template.isBuiltIn) return

    if (confirm(`Delete template "${template.name}"?`)) {
      deleteTemplate(template.id)
      setTemplates(getAllTemplates())
      if (selectedTemplate?.id === template.id) {
        setSelectedTemplate(null)
      }
    }
  }, [selectedTemplate])

  // Refresh templates list
  const refreshTemplates = useCallback(() => {
    setTemplates(getAllTemplates())
  }, [])

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCreateDialog) {
          setShowCreateDialog(false)
        } else if (selectedTemplate) {
          setSelectedTemplate(null)
        } else {
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, showCreateDialog, selectedTemplate])

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex h-[80vh] w-[900px] max-w-[95vw] flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
          <h2 className="text-lg font-semibold text-zinc-100">Prompt Templates</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar - Categories */}
          <div className="w-48 flex-shrink-0 overflow-y-auto border-r border-zinc-700 p-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`mb-2 w-full rounded-md px-3 py-2 text-left text-sm ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              All Templates
            </button>

            <div className="my-2 border-t border-zinc-700" />

            {(Object.entries(TEMPLATE_CATEGORIES) as [TemplateCategory, { label: string; icon: string }][]).map(
              ([key, { label, icon }]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`mb-1 w-full rounded-md px-3 py-2 text-left text-sm ${
                    selectedCategory === key
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <span className="mr-2">{icon}</span>
                  {label}
                </button>
              )
            )}

            <div className="my-3 border-t border-zinc-700" />

            <button
              onClick={() => setShowCreateDialog(true)}
              className="w-full rounded-md bg-green-600 px-3 py-2 text-left text-sm font-medium text-white hover:bg-green-500"
            >
              + New Template
            </button>
          </div>

          {/* Main content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Search bar */}
            <div className="border-b border-zinc-700 p-3">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 pl-9 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Templates list */}
            <div className="flex-1 overflow-y-auto p-3">
              {groupedTemplates ? (
                // Grouped view
                Array.from(groupedTemplates.entries()).map(([category, categoryTemplates]) => {
                  const meta = TEMPLATE_CATEGORIES[category]
                  const isExpanded = expandedCategories.has(category)

                  return (
                    <div key={category} className="mb-2">
                      <button
                        onClick={() => toggleCategory(category)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                      >
                        <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▸</span>
                        <span>{meta.icon}</span>
                        <span>{meta.label}</span>
                        <span className="text-xs text-zinc-500">({categoryTemplates.length})</span>
                      </button>

                      {isExpanded && (
                        <div className="ml-4 mt-1 space-y-1">
                          {categoryTemplates.map(template => (
                            <TemplateCard
                              key={template.id}
                              template={template}
                              isSelected={selectedTemplate?.id === template.id}
                              onSelect={() => handleSelectTemplate(template)}
                              onDragStart={e => handleDragStart(e, template)}
                              onEdit={() => setEditingTemplate(template)}
                              onDelete={() => handleDelete(template)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                // Flat list (search/filter mode)
                <div className="space-y-1">
                  {filteredTemplates.length === 0 ? (
                    <p className="py-8 text-center text-sm text-zinc-500">
                      No templates found for "{searchQuery}"
                    </p>
                  ) : (
                    filteredTemplates.map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        isSelected={selectedTemplate?.id === template.id}
                        onSelect={() => handleSelectTemplate(template)}
                        onDragStart={e => handleDragStart(e, template)}
                        onEdit={() => setEditingTemplate(template)}
                        onDelete={() => handleDelete(template)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar - Template preview */}
          {selectedTemplate && (
            <div className="w-72 flex-shrink-0 overflow-y-auto border-l border-zinc-700 p-4">
              <h3 className="mb-2 font-semibold text-zinc-200">{selectedTemplate.name}</h3>
              {selectedTemplate.description && (
                <p className="mb-3 text-sm text-zinc-400">{selectedTemplate.description}</p>
              )}

              {/* Variables input */}
              {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-medium uppercase text-zinc-500">Variables</p>
                  {selectedTemplate.variables.map(variable => (
                    <div key={variable}>
                      <label className="mb-1 block text-xs text-zinc-400">{`{${variable}}`}</label>
                      <input
                        type="text"
                        value={variableInputs[variable] || ''}
                        onChange={e =>
                          setVariableInputs(prev => ({ ...prev, [variable]: e.target.value }))
                        }
                        placeholder={`Enter ${variable}...`}
                        className="w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Preview */}
              <div className="mb-4">
                <p className="mb-1 text-xs font-medium uppercase text-zinc-500">Preview</p>
                <div className="rounded-md border border-zinc-700 bg-zinc-800 p-3 text-sm text-zinc-300">
                  {selectedTemplate.variables?.length
                    ? applyVariables(selectedTemplate.content, variableInputs)
                    : selectedTemplate.content}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {onInsert && (
                  <button
                    onClick={handleInsert}
                    className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
                  >
                    Insert
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="flex-1 rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
                >
                  Copy
                </button>
              </div>

              <p className="mt-3 text-center text-xs text-zinc-500">
                💡 Tip: Drag template onto a Prompt node
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Template Dialog */}
      {(showCreateDialog || editingTemplate) && (
        <CreateTemplateDialog
          template={editingTemplate}
          onClose={() => {
            setShowCreateDialog(false)
            setEditingTemplate(null)
          }}
          onSave={() => {
            refreshTemplates()
            setShowCreateDialog(false)
            setEditingTemplate(null)
          }}
        />
      )}
    </div>
  )
}

// Template card component
interface TemplateCardProps {
  template: PromptTemplate
  isSelected: boolean
  onSelect: () => void
  onDragStart: (e: React.DragEvent) => void
  onEdit: () => void
  onDelete: () => void
}

function TemplateCard({
  template,
  isSelected,
  onSelect,
  onDragStart,
  onEdit,
  onDelete,
}: TemplateCardProps) {
  const meta = TEMPLATE_CATEGORIES[template.category]

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      className={`group cursor-pointer rounded-md border p-2 transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs">{meta.icon}</span>
            <span className="text-sm font-medium text-zinc-200">{template.name}</span>
            {template.variables && template.variables.length > 0 && (
              <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400">
                {template.variables.length} var{template.variables.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{template.content}</p>
        </div>

        {/* Actions */}
        <div className="ml-2 flex opacity-0 transition-opacity group-hover:opacity-100">
          {!template.isBuiltIn && (
            <>
              <button
                onClick={e => {
                  e.stopPropagation()
                  onEdit()
                }}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-200"
                title="Edit"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={e => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="rounded p-1 text-zinc-400 hover:bg-red-600 hover:text-white"
                title="Delete"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Create/Edit template dialog
interface CreateTemplateDialogProps {
  template?: PromptTemplate | null
  onClose: () => void
  onSave: () => void
}

function CreateTemplateDialog({ template, onClose, onSave }: CreateTemplateDialogProps) {
  const [name, setName] = useState(template?.name || '')
  const [content, setContent] = useState(template?.content || '')
  const [category, setCategory] = useState<TemplateCategory>(template?.category || 'custom')
  const [description, setDescription] = useState(template?.description || '')

  const variables = useMemo(() => extractVariables(content), [content])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !content.trim()) return

    if (template) {
      updateTemplate(template.id, { name, content, category, description })
    } else {
      createTemplate(name, content, category, description)
    }

    onSave()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="w-[500px] max-w-[90vw] rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
      >
        <h3 className="mb-4 text-lg font-semibold text-zinc-100">
          {template ? 'Edit Template' : 'Create Template'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-400">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Template name..."
              className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-400">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as TemplateCategory)}
              className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
            >
              {(Object.entries(TEMPLATE_CATEGORIES) as [TemplateCategory, { label: string; icon: string }][]).map(
                ([key, { label, icon }]) => (
                  <option key={key} value={key}>
                    {icon} {label}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-400">
              Content
              <span className="ml-2 text-xs text-zinc-500">
                Use {'{variable}'} for placeholders
              </span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Enter prompt template..."
              rows={5}
              className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
              required
            />
            {variables.length > 0 && (
              <p className="mt-1 text-xs text-zinc-500">
                Variables detected: {variables.map(v => `{${v}}`).join(', ')}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-400">
              Description <span className="text-zinc-600">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description..."
              className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            {template ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </form>
    </div>
  )
}
