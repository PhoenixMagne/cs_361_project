import zmq
import json

class RecipeImageClient:
    def __init__(self, address="tcp://localhost:5555"):
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.REQ)
        self.socket.connect(address)

    def get_image_for_recipe(self, recipe_name):
        # Construct the payload your microservice expects
        payload = {
            "query": f"{recipe_name} food photography",
            "limit": 1,
            "dest_dir": "static/uploads/recipes" # Ensure this folder exists
        }

        try:
            # Send the request
            self.socket.send_json(payload)
            
            # Receive the response
            # Note: Since your server uses socket.send_json(json_pack), 
            # you may need to json.loads() it once.
            response = self.socket.recv_json()
            
            if isinstance(response, str):
                response = json.loads(response)

            if "results" in response and len(response["results"]) > 0:
                return response["results"][0]
            return None
            
        except Exception as e:
            print(f"Connection to Image Service failed: {e}")
            return None