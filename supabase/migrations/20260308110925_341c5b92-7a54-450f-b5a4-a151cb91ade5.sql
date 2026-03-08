-- Enable eCourier provider
UPDATE courier_providers 
SET is_active = true 
WHERE provider = 'ecourier';