#!/bin/bash

# Remove all _data variable declarations (they're unused and not needed)
sed -i '/const _data = job.data;/d' src/jobs/index.ts

# Remove _CACHE_TTL (comment out entire line)
sed -i '/const _CACHE_TTL =/d' src/services/marketData.service.ts
sed -i '/\/\/ Cache TTL not yet used/d' src/services/marketData.service.ts

echo "Applied fixes"
