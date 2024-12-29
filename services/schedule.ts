import type { MonthSchedule, WeekSchedule } from '../types/schedule'
import { AttendanceStatus } from '../constants'
import { addWeeks, addDays, startOfWeek, nextMonday, isWeekend } from 'date-fns'

const createWeekSchedule = (startDate: Date): WeekSchedule => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  return days.reduce((acc, day, index) => {
    const date = addDays(startDate, index)
    acc[day] = {
      attendees: [],
      date: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    }
    return acc
  }, {} as WeekSchedule)
}

export const createMonthSchedule = (
  startFromNextMonday: boolean = false,
): MonthSchedule => {
  const today = new Date()
  let monday = startOfWeek(today, { weekStartsOn: 1 })

  if (startFromNextMonday || isWeekend(today) || today.getDay() === 5) {
    monday = nextMonday(today)
  }

  return Array.from({ length: 4 }).reduce<MonthSchedule>(
    (acc, _, weekIndex) => {
      const weekStart = addWeeks(monday, weekIndex)
      acc[weekIndex] = createWeekSchedule(weekStart)
      return acc
    },
    {},
  )
}

export const updateAttendance = (
  schedule: MonthSchedule,
  day: string,
  week: number,
  userId: string,
  status: AttendanceStatus,
): MonthSchedule => {
  if (!day || !(day in schedule[week])) return schedule

  const user = `<@${userId}>`
  const updatedSchedule = { ...schedule }

  if (status === AttendanceStatus.Office) {
    if (!updatedSchedule[week][day].attendees.includes(user)) {
      updatedSchedule[week] = {
        ...updatedSchedule[week],
        [day]: {
          ...updatedSchedule[week][day],
          attendees: [...updatedSchedule[week][day].attendees, user],
        },
      }
    }
  } else {
    updatedSchedule[week] = {
      ...updatedSchedule[week],
      [day]: {
        ...updatedSchedule[week][day],
        attendees: updatedSchedule[week][day].attendees.filter(
          (a) => a !== user,
        ),
      },
    }
  }

  return updatedSchedule
}

export const getDayAttendance = (
  schedule: WeekSchedule,
  day: string,
): string[] => {
  return schedule[day]?.attendees || []
}

export const isAttending = (
  schedule: WeekSchedule,
  day: string,
  userId: string,
): boolean => {
  const user = `<@${userId}>`
  return schedule[day]?.attendees.includes(user) || false
}
