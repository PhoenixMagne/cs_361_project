import zmq
import json

# take a raw text input and parse it into a structured format

def parse_text(raw_text):
    # Split lines and clean whitespace
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    
    if len(lines) < 3:
        return {"status": "error", "message": "Text too short"}

    # quick formatting for recipe files, probably should change this if you are using this for a different purpose
    return { 
        "name": lines[0],
        "price": lines[1],
        "ingredients": [i.strip() for i in lines[2].split(',')],
        "steps": lines[3:] if len(lines) > 3 else []
    }

def main():
    context = zmq.Context()
    socket = context.socket(zmq.REP)
    socket.bind("tcp://*:5556")
    
    print("Recipe Parser Service started on port 5556...")

    while True:
        # Receive raw text from Node.js
        message = socket.recv_string()
        
        # Process the text
        result = parse_text(message)
        
        # Send JSON string back
        socket.send_string(json.dumps(result))

if __name__ == "__main__":
    main()