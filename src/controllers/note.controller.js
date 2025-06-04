import Note from "../models/note.model.js"

export const createNote = async (req, res) => {
  try {
    const { title, content } = req.body
    const newNote = await Note.create({
      userId: req.user._id,
      title,
      content,
    })
    return res.status(201).json(newNote)
  } catch (err) {
    console.error("Create Note Error:", err)
    return res.status(500).json({ error: "Could not create note" })
  }
}

export const getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user._id }).sort({
      createdAt: -1,
    })
    return res.status(200).json(notes)
  } catch (err) {
    console.error("Get Notes Error:", err)
    return res.status(500).json({ error: "Could not fetch notes" })
  }
}

export const getNoteById = async (req, res) => {
  try {
    const { noteId } = req.params
    const note = await Note.findOne({ _id: noteId, userId: req.user._id })
    if (!note) return res.status(404).json({ error: "Note not found" })
    return res.status(200).json(note)
  } catch (err) {
    console.error("Get Note By ID Error:", err)
    return res.status(500).json({ error: "Could not fetch note" })
  }
}

export const updateNote = async (req, res) => {
  try {
    const { noteId } = req.params
    const { title, content } = req.body
    const note = await Note.findOneAndUpdate(
      { _id: noteId, userId: req.user._id },
      { title, content, updatedAt: Date.now() },
      { new: true }
    )
    if (!note)
      return res
        .status(404)
        .json({ error: "Note not found or not owned by you" })
    return res.status(200).json(note)
  } catch (err) {
    console.error("Update Note Error:", err)
    return res.status(500).json({ error: "Could not update note" })
  }
}

export const deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params
    const note = await Note.findOneAndDelete({
      _id: noteId,
      userId: req.user._id,
    })
    if (!note)
      return res
        .status(404)
        .json({ error: "Note not found or not owned by you" })
    return res.status(200).json({ message: "Note deleted" })
  } catch (err) {
    console.error("Delete Note Error:", err)
    return res.status(500).json({ error: "Could not delete note" })
  }
}
