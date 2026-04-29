import { FormEvent, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '@/components/page-shell'
import { Input } from '@/components/input'
import { TextArea } from '@/components/text-area'
import { Button } from '@/components/button'
import { api } from '@/lib/api'

type JoinPolicy = 'OPEN' | 'REQUEST' | 'INVITE_ONLY'

type Group = {
  id: string
  name: string
  description: string
  joinPolicy: JoinPolicy
}

const NAME_MIN = 3
const NAME_MAX = 80
const DESCRIPTION_MAX = 500

const policyOptions: Array<{ value: JoinPolicy; label: string; description: string; mark: string }> = [
  {
    value: 'OPEN',
    mark: 'AB',
    label: 'Aberto',
    description: 'Qualquer pessoa pode entrar diretamente sem aprovação.'
  },
  {
    value: 'REQUEST',
    mark: 'SO',
    label: 'Por solicitação',
    description: 'Pessoas pedem para entrar e os admins aprovam.'
  },
  {
    value: 'INVITE_ONLY',
    mark: 'CV',
    label: 'Somente convite',
    description: 'Apenas pessoas convidadas pelos admins podem participar.'
  }
]

export function NewGroupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>('REQUEST')
  const [error, setError] = useState('')

  const createGroup = useMutation({
    mutationFn: async () => {
      const res = await api.post<Group>('/groups', {
        name: name.trim(),
        description: description.trim(),
        joinPolicy,
        imageUrl: null
      })
      return res.data
    },
    onSuccess: (group) => {
      navigate(`/groups/${group.id}`)
    },
    onError: (err: any) => {
      if (err?.response?.status === 401) {
        setError('Sua sessão expirou. Entre novamente para criar o grupo.')
        return
      }
      if (!err?.response) {
        setError('Backend indisponível. Verifique se a API está rodando em http://localhost:8080.')
        return
      }
      setError(err?.response?.data?.error?.message || 'Não foi possível criar o grupo.')
    }
  })

  const trimmedName = name.trim()
  const trimmedDescription = description.trim()
  const nameValid = trimmedName.length >= NAME_MIN && trimmedName.length <= NAME_MAX
  const descriptionValid = trimmedDescription.length <= DESCRIPTION_MAX
  const canSubmit = nameValid && descriptionValid && !createGroup.isPending

  const nameCounter = useMemo(() => `${trimmedName.length}/${NAME_MAX}`, [trimmedName])
  const descriptionCounter = useMemo(() => `${trimmedDescription.length}/${DESCRIPTION_MAX}`, [trimmedDescription])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!nameValid) {
      setError(`O nome do grupo precisa ter entre ${NAME_MIN} e ${NAME_MAX} caracteres.`)
      return
    }
    if (!descriptionValid) {
      setError(`A descrição precisa ter no máximo ${DESCRIPTION_MAX} caracteres.`)
      return
    }
    createGroup.mutate()
  }

  return (
    <PageShell>
      <section className="pv-panel rounded-3xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Novo grupo</p>
        <h1 className="pv-title mt-2 text-2xl font-bold text-secondary sm:text-3xl">Crie uma comunidade de oração</h1>
        <p className="pv-muted mt-2 max-w-2xl text-sm">
          Defina um espaço próprio para reunir intenções da sua pastoral, célula ou grupo de amigos. Você pode mudar essas
          configurações depois nas opções do grupo.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-8">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="pv-group-name" className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Nome <span className="text-secondary/60">·</span> como o grupo aparece
              </label>
              <span className={`text-[11px] tabular-nums ${trimmedName.length > NAME_MAX ? 'text-primary' : 'pv-muted'}`}>{nameCounter}</span>
            </div>
            <Input
              id="pv-group-name"
              className="mt-1.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Pastoral Familiar - Paróquia São José"
              maxLength={NAME_MAX + 20}
            />
            <p className="pv-muted mt-1.5 text-xs">Entre {NAME_MIN} e {NAME_MAX} caracteres. Aparece no card e no cabeçalho.</p>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="pv-group-description" className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Descrição <span className="text-secondary/60">·</span> apresente o grupo
              </label>
              <span className={`text-[11px] tabular-nums ${trimmedDescription.length > DESCRIPTION_MAX ? 'text-primary' : 'pv-muted'}`}>{descriptionCounter}</span>
            </div>
            <TextArea
              id="pv-group-description"
              className="mt-1.5 min-h-[140px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Conte de forma breve o propósito do grupo, quem pode participar e o que será compartilhado por aqui."
            />
            <p className="pv-muted mt-1.5 text-xs">Opcional, mas ajuda quem decide se quer entrar.</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Política de entrada</p>
            <p className="pv-muted mt-1 text-xs">Define como novos membros podem se juntar ao grupo.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {policyOptions.map((option) => {
                const active = joinPolicy === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setJoinPolicy(option.value)}
                    aria-pressed={active}
                    className={`flex h-full flex-col gap-2 rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-primary bg-primary/10 shadow-[0_10px_24px_-16px_var(--fx-ring)]'
                        : 'border-primary bg-panel hover:bg-primary/5'
                    }`}
                  >
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ${active ? 'bg-primary text-onPrimary' : 'bg-primary/10 text-primary'}`}>
                      {option.mark}
                    </span>
                    <span className={`text-sm font-semibold ${active ? 'text-primary' : 'text-secondary'}`}>{option.label}</span>
                    <span className="text-[11px] leading-snug text-primary/80">{option.description}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-primary/30 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="pv-muted text-xs">Você será admin do grupo recém-criado.</p>
            <div className="flex gap-2 sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => navigate('/groups')} disabled={createGroup.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {createGroup.isPending ? 'Criando…' : 'Criar grupo'}
              </Button>
            </div>
          </div>

          {error && <p role="alert" className="rounded-xl border border-primary bg-panel px-3 py-2 text-sm text-primary">{error}</p>}
        </form>
      </section>
    </PageShell>
  )
}
