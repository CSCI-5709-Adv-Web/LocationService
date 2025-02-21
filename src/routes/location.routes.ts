import express from 'express';
import { calculateRoute } from '../service/location.service';

const router = express.Router();

// Route Calculation API
router.post('/route', async (req, res) => {
    
    try {
        const { fromAddress, toAddress } = req.body;
        if (!fromAddress || !toAddress) {
            return res.status(400).json({ error: "Both 'from' and 'to' addresses are required" });
        }

        const routeData = await calculateRoute(fromAddress, toAddress);

        res.send(routeData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
