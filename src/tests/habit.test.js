import assert from 'assert'
import mongoose from 'mongoose'
import Habit from '../models/habit.model.js'

const userId = new mongoose.Types.ObjectId()

const habit = new Habit({
  userId,
  title: 'Quit Smoking',
  frequency: 'daily',
  startDate: new Date(),
  icon: '🚬',
  type: 'quit'
})

assert.strictEqual(habit.type, 'quit')
assert.deepStrictEqual(habit.slipDates, [])

habit.slipDates.push(new Date('2024-01-01'))
assert.strictEqual(habit.slipDates.length, 1)

console.log('habit model tests passed')

