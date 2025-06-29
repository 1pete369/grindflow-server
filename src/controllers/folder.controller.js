// controllers/folder.controller.js
import Folder from "../models/folder.model.js"
import Task from "../models/task.model.js"

// 1. Create
export const createFolder = async (req, res) => {
  console.log("Came to create folder")
  try {
    const folder = await Folder.create({
      name: req.body.name,
      color: req.body.color,
      userId: req.user._id,
    })
    res.status(201).json(folder)
  } catch (err) {
    console.error("❌ createFolder:", err)
    res.status(500).json({ error: "Failed to create folder" })
  }
}

// 2. Read all
export const getAllFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ userId: req.user._id }).sort(
      "createdAt"
    )
    console.log("Folders", folders)
    res.json(folders)
  } catch (err) {
    console.error("❌ getAllFolders:", err)
    res.status(500).json({ error: "Failed to fetch folders" })
  }
}

// 3. Read one
export const getFolderById = async (req, res) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
    if (!folder) return res.status(404).json({ error: "Folder not found" })
    res.json(folder)
  } catch (err) {
    console.error("❌ getFolderById:", err)
    res.status(500).json({ error: "Failed to fetch folder" })
  }
}

// 4. Update
export const updateFolder = async (req, res) => {
  try {
    const updated = await Folder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: req.body }, // e.g. { name, color }
      { new: true }
    )
    if (!updated) return res.status(404).json({ error: "Folder not found" })
    res.json(updated)
  } catch (err) {
    console.error("❌ updateFolder:", err)
    res.status(500).json({ error: "Failed to update folder" })
  }
}

// 5. Delete
export const deleteFolder = async (req, res) => {
  try {
    const deleted = await Folder.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    })
    if (!deleted) return res.status(404).json({ error: "Folder not found" })

    // optional: unassign tasks in that folder
    await Task.updateMany(
      { folderId: deleted._id, userId: req.user._id },
      { $set: { folderId: null } }
    )

    res.json({ message: "Folder deleted" })
  } catch (err) {
    console.error("❌ deleteFolder:", err)
    res.status(500).json({ error: "Failed to delete folder" })
  }
}
