const express = require("express");
const { getDB } = require("../config/db");
const verifyFBToken = require("../middleware/verifyFBToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const { ObjectId } = require("mongodb");
const router = express.Router();

const warehousesCollection = () => {
  return getDB().collection("warehouses");
};

// GET all active warehouses
router.get("/", async (req, res) => {
  try {
    const warehouses = await warehousesCollection()
      .find({})
      .sort({ district: 1 })
      .toArray();

    res.status(200).send({
      success: true,
      data: warehouses,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch warehouses",
    });
  }
});

// GET SINGLE WAREHOUSE
router.get("/:id", verifyFBToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid warehouse ID",
      });
    }

    const warehouse = await warehousesCollection().findOne({
      _id: new ObjectId(id),
    });

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    res.status(200).json({
      success: true,
      data: warehouse,
    });
  } catch (error) {
    console.error("Get warehouse error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch warehouse",
    });
  }
});

// CREATE WAREHOUSE
router.post("/", verifyFBToken, verifyAdmin, async (req, res) => {
  try {
    const {
      region,
      district,
      city,
      covered_area,
      status,
      flowchart,
      longitude,
      latitude,
    } = req.body;

    if (
      !region ||
      !district ||
      !city ||
      !Array.isArray(covered_area) ||
      covered_area.length === 0 ||
      !status ||
      longitude === undefined ||
      latitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Required warehouse information is missing",
      });
    }

    // Prevent duplicate district
    const existingWarehouse = await warehousesCollection().findOne({
      district: {
        $regex: `^${district.trim()}$`,
        $options: "i",
      },
    });

    if (existingWarehouse) {
      return res.status(409).json({
        success: false,
        message: "A warehouse already exists for this district",
      });
    }

    const warehouseData = {
      region: region.trim(),
      district: district.trim(),
      city: city.trim(),
      covered_area: covered_area.map((area) => area.trim()).filter(Boolean),
      status,
      flowchart: flowchart?.trim() || "",
      longitude: Number(longitude),
      latitude: Number(latitude),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await warehousesCollection().insertOne(warehouseData);

    res.status(201).json({
      success: true,
      message: "Warehouse created successfully",
      data: {
        insertedId: result.insertedId,
        ...warehouseData,
      },
    });
  } catch (error) {
    console.error("Create warehouse error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create warehouse",
    });
  }
});

// UPDATE WAREHOUSE
router.patch("/:id", verifyFBToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid warehouse ID",
      });
    }

    const {
      region,
      district,
      city,
      covered_area,
      status,
      flowchart,
      longitude,
      latitude,
    } = req.body;

    if (
      !region ||
      !district ||
      !city ||
      !Array.isArray(covered_area) ||
      covered_area?.length === 0 ||
      !status ||
      longitude === undefined ||
      latitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Required warehouse information is missing",
      });
    }

    // Check another warehouse with same district
    const duplicateWarehouse = await warehousesCollection().findOne({
      district: {
        $regex: `^${district.trim()}$`,
        $options: "i",
      },
      _id: {
        $ne: new ObjectId(id),
      },
    });

    if (duplicateWarehouse) {
      return res.status(409).json({
        success: false,
        message: "Another warehouse already exists for this district",
      });
    }

    const updateData = {
      region: region.trim(),
      district: district.trim(),
      city: city.trim(),
      covered_area: covered_area.map((area) => area.trim()).filter(Boolean),
      status,
      flowchart: flowchart?.trim() || "",
      longitude: Number(longitude),
      latitude: Number(latitude),
      updatedAt: new Date(),
    };

    const result = await warehousesCollection().updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: updateData,
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Warehouse updated successfully",
      data: updateData,
    });
  } catch (error) {
    console.error("Update warehouse error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update warehouse",
    });
  }
});

// DELETE WAREHOUSE
router.delete("/:id", verifyFBToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid warehouse ID",
      });
    }

    const result = await warehousesCollection().deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Warehouse deleted successfully",
    });
  } catch (error) {
    console.error("Delete warehouse error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete warehouse",
    });
  }
});

module.exports = router;
