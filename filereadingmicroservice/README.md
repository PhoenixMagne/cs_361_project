Microservice for a simple file parser/partitioner.
Inputs a txt file and returns the data within the file based on how the parsing is configured. 

this service uses Python 3 and the pyzmq library. 
to run the service, run the following line in your terminal:
python3 parser_service.py

Input Format (.txt file)
Line 1: Recipe Name
Line 2: Price/Cost
Line 3: Ingredients (comma-separated)
Line 4+: Cooking Steps (one per line)

for other types, modify the parsing code to fit your specifications. 
example usage:

input file:
Lemon Bars
6.00
Lemon juice, Flour, Sugar, Butter
Mix crust ingredients.
Bake at 350F for 20 mins.
Pour lemon filling over crust.

example response:
{
  "name": "Lemon Bars",
  "price": "6.00",
  "ingredients": ["Lemon juice", "Flour", "Sugar", "Butter"],
  "steps": ["Mix crust ingredients.", "Bake at 350F for 20 mins.", "Pour lemon filling over crust."]
}