import app from "./express-app";
import { logger } from "./utils/logger";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    logger.info(`Location Service running on port ${PORT}`);
});
