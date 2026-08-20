import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { type FC, type FormEvent, useId, useMemo, useState } from 'react'
import { groupBy } from 'remeda'
import { z } from 'zod'
import { getTemplateSectionIds } from './get-template-section-ids.js'
import style from './styles.scss.js'

export const Manifest = z.object({
  sections: z.array(z.string().min(1)),
  templates: z.array(
    z.object({
      name: z.string().min(1),
      suffix: z.string().nullable()
    })
  )
})
export type Manifest = z.infer<typeof Manifest>

export const Props = z.object({
  defaultTemplateName: z.string().min(1).nullable(),
  defaultTemplateView: z.string().nullable(),
  selectedSections: z.array(z.string().min(1)),
  selectedView: z.string().nullable(),
  manifest: Manifest
})
export type Props = z.infer<typeof Props>

export const Main: FC<Props> = ({
  selectedSections,
  selectedView,
  defaultTemplateName,
  defaultTemplateView,
  manifest
}) => {
  const [nextView, setNextView] = useState<string | null>(
    selectedView ?? defaultTemplateView
  )
  const [nextSections, setNextSections] = useState<string[]>(selectedSections)

  const viewDropdownId = useId()
  const sectionDropdownId = useId()

  const templateSectionIdsQuery = useQuery({
    queryKey: ['template-section-ids', nextView],
    queryFn: async ({ signal }) => {
      if (!nextView) {
        return []
      }

      return await getTemplateSectionIds({
        view: nextView,
        signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)])
      })
    }
  })

  const templateSectionIds = useMemo(
    () => templateSectionIdsQuery.data ?? [],
    [templateSectionIdsQuery.data]
  )

  const handleSubmit = (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault()

    const currentUrl = new URL(window.location.href)
    const nextUrl = new URL(currentUrl.origin + currentUrl.pathname)

    nextUrl.searchParams.set('view', 'workbench')
    nextUrl.searchParams.set('workbench-sections', nextSections.join(','))

    if (nextView) {
      nextUrl.searchParams.set('workbench-view', nextView)
    }

    window.location.href = nextUrl.toString()
  }

  const views = manifest.templates.flatMap((template): string[] => {
    if (template.suffix == null) {
      return []
    }

    if (template.name === defaultTemplateName) {
      return [template.suffix]
    }

    return []
  })

  const isPending: boolean =
    templateSectionIdsQuery.status === 'pending' ||
    templateSectionIdsQuery.fetchStatus === 'fetching'

  const submitDisabled: boolean = isPending ? true : nextSections.length === 0

  const sectionGroups = groupBy(manifest.sections, (section) => {
    return section.startsWith('internal-') ? 'internal' : 'other'
  })

  return (
    <>
      <section className={clsx(style.summary)}>
        <dl>
          <dt>View:</dt>
          <dd>{nextView || 'None'}</dd>
          <dt>Sections:</dt>
          {nextSections.length > 0 ? (
            <dd>
              <ul>
                {nextSections.map((section) => (
                  <li key={section}>{section}</li>
                ))}
              </ul>
            </dd>
          ) : (
            <dd>None</dd>
          )}
        </dl>
      </section>
      <form action="#" onSubmit={handleSubmit}>
        {views.length > 0 ? (
          <>
            <label htmlFor={viewDropdownId}>View</label>
            <select
              id={viewDropdownId}
              name="workbench-view"
              className={clsx(style.dropdown)}
              value={nextView ?? ''}
              onChange={(e) => {
                setNextView(e.target.value)
              }}
            >
              <option value="">None</option>
              {views.map((view) => (
                <option key={view} value={view}>
                  {view}
                </option>
              ))}
            </select>
            <hr />
          </>
        ) : null}
        <label htmlFor={sectionDropdownId}>Select sections</label>
        <select
          id={sectionDropdownId}
          name="workbench-sections"
          className={clsx(style.multi_select)}
          multiple
          value={nextSections}
          onChange={(evt) => {
            const values = Array.from(evt.target.selectedOptions).flatMap(
              (option) => {
                return option.value ? [option.value] : []
              }
            )

            setNextSections(values)
          }}
        >
          <option value="" disabled>
            Select sections
          </option>
          {templateSectionIds.length ? (
            <optgroup label="Template">
              {templateSectionIds.map((sectionId) => (
                <option key={sectionId} value={sectionId}>
                  {sectionId}
                </option>
              ))}
            </optgroup>
          ) : null}
          {sectionGroups.internal?.length ? (
            <optgroup label="Internal">
              {sectionGroups.internal.map((sectionId) => (
                <option key={sectionId} value={sectionId}>
                  {sectionId}
                </option>
              ))}
            </optgroup>
          ) : null}
          {sectionGroups.other?.length ? (
            <optgroup label="Other">
              {sectionGroups.other.map((sectionId) => (
                <option key={sectionId} value={sectionId}>
                  {sectionId}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
        <hr />
        {templateSectionIdsQuery.status === 'error' ? (
          <>
            <p className={clsx(style.warning)}>
              {templateSectionIdsQuery.error.message}
            </p>
            <hr />
          </>
        ) : null}
        <button type="submit" disabled={submitDisabled}>
          {isPending ? '...' : submitDisabled ? 'No sections selected' : 'Load'}
        </button>
      </form>
    </>
  )
}
