import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSeason } from '#/lib/anilist/season'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const { season, year } = getCurrentSeason()
    throw redirect({
      to: '/$season/$year',
      params: { season, year: String(year) },
    })
  },
})
