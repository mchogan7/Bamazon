var inquirer = require("inquirer");
var mysql = require("mysql");
require('console.table');

var connection = mysql.createConnection({
    host: "localhost",
    port: 3306,

    // Your username
    user: "root",

    // Your password
    password: "",
    database: "bamazon_db"
});

rootMenu()

function rootMenu(){
    console.log(' ')
    console.log('------------------')
inquirer.prompt([{
    type: 'list',
    name: "initialChoice",
    message: "You are a:",
    choices: ["Customer", "Manager", "Supervisor"]
}]).then(function(response) {
    if (response.initialChoice === 'Customer') {
        showCustomerProducts()
    } else if (response.initialChoice === 'Manager') {
        managerMenu()
    } else if (response.initialChoice === 'Supervisor') {
        supervisorMenu()
    }
})
}


function showCustomerProducts() {
    connection.query('SELECT item_id, product_name, customer_price, department_name FROM bamazon_db.products', function(error, results, fields) {
        console.table(results)
        customerBuyProduct()
    });
}


function supervisorMenu() {
    inquirer.prompt([{
        type: 'list',
        name: "supervisorChoice",
        message: "Select one:",
        choices: ["View sales by department", "Create new department", "Root Menu"]
    }]).then(function(response) {
        if (response.supervisorChoice === 'View sales by department') {
            viewDepartmentSales()
        } else if (response.supervisorChoice === 'Create new department') {
            createNewDepartment()
        } else if (response.supervisorChoice === "Root Menu") {
            rootMenu()
        }
    })
}

function createNewDepartment(){
    inquirer.prompt([{
        name: "department_name",
        message: "Enter name of new Department"
    }, {
        name: "over_head_costs",
        message: "Initial over head costs?"
    }]).then(function(response) {
        postNewDepartment(response)
    })
}

    function postNewDepartment(response) {
    var dataObject = new newDepartment(response.department_name, response.over_head_costs)
    connection.query("INSERT INTO departments SET ?", [
        dataObject
    ], function(error, results, fields) {
        console.log('Department Added!')
        supervisorMenu()
    });
}

    function newDepartment(department_name, over_head_costs) {
        this.department_name = department_name,
        this.over_head_costs = over_head_costs,
        this.total_sales = 0
        }



function viewDepartmentSales() {
    connection.query('SELECT departments.department_id, products.department_name, departments.over_head_costs, SUM(products.product_sales) * SUM(products.customer_price) as product_sales, SUM(products.product_sales) * SUM(products.customer_price) - departments.over_head_costs AS total_profits FROM products JOIN departments ON departments.department_name = products.department_name GROUP BY departments.department_id, products.department_name, departments.over_head_costs', function(error, results, fields) {
        if (error) throw error

        console.table(results)
        supervisorMenu()
    });
}

function managerMenu() {
    inquirer.prompt([{
        type: 'list',
        name: "managerChoice",
        message: "Select one:",
        choices: ["View Products", "View Low Inventory", "Add to Inventory", "Add New Product", "Root Menu"]
    }]).then(function(response) {
        if (response.managerChoice === 'View Products') {
            viewAllProducts()
        } else if (response.managerChoice === 'View Low Inventory') {
            viewLowInventory()
        } else if (response.managerChoice === 'Add to Inventory') {
            addInventory()
        } else if (response.managerChoice === 'Add New Product') {
            addNewProduct()
        } else if (response.managerChoice === "Root Menu") {
            rootMenu()
        }
    })
}

function viewAllProducts() {
    connection.query('SELECT * FROM bamazon_db.products', function(error, results, fields) {
        if (error) throw error

        console.table(results)
        managerMenu()
    });
}

function viewLowInventory() {
    connection.query('SELECT * FROM bamazon_db.products WHERE stock_qty < 5', function(error, results, fields) {
        if (error) throw error
        console.table(results)
        managerMenu()
    });
}

function addInventory() {
    inquirer.prompt([{
        name: "itemID",
        message: "Enter Item ID to update:"
    }, {
        name: "invAdd",
        message: "How many are you adding to stock?"
    }]).then(function(response) {
        stockUpdate(response.itemID, response.invAdd)
    })
}

function stockUpdate(itemID, addQty) {
    connection.query('UPDATE bamazon_db.products SET stock_qty = stock_qty + ? WHERE item_id = ?', [addQty, itemID], function(error, results, fields) {
        console.log('Stock added!')
        viewAllProducts()
    });
}

function addNewProduct() {
    inquirer.prompt([{
        name: "product_name",
        message: "Enter name of products"
    }, {
        name: "department_name",
        message: "What deparment is this going in?"
    }, {
        name: "customer_price",
        message: "What is the price?"
    }, {
        name: "stock_qty",
        message: "How many are you stocking?"
    }]).then(function(response) {
        postItem(response)
    })

}


//Item constructor object.
function newItem(product_name, department_name, customer_price, stock_qty) {
    this.product_name = product_name,
        this.department_name = department_name,
        this.customer_price = customer_price,
        this.stock_qty = stock_qty,
        this.product_sales = 0
}


function postItem(response) {
    var dataObject = new newItem(response.product_name, response.department_name, response.customer_price, response.stock_qty)
    connection.query("INSERT INTO products SET ?", [
        dataObject
    ], function(error, results, fields) {
        console.log('Item Added!')
        managerMenu()
    });
}

function customerBuyProduct() {
    inquirer.prompt([{
        name: "itemID",
        message: "Choose an item by ID."
    }, {
        name: "desiredItemQty",
        message: "How many do you want to purchase?"
    }]).then(function(response) {
        enoughStock(response.itemID, response.desiredItemQty)
    })
}

function enoughStock(itemID, DesiredItemQty) {
    connection.query('SELECT stock_qty, customer_price FROM bamazon_db.products WHERE item_id = ?', [itemID], function(error, results, fields) {
        //Precalculate total to save a database query.
        var totalPrice = results[0].customer_price * DesiredItemQty

        if (results[0].stock_qty > DesiredItemQty) {
            placeOrder(itemID, DesiredItemQty, totalPrice)
        } else {
            console.log('Sorry! We only have ' + results[0].stock_qty + ' left.')
            customerBuyProduct()
        }
    });
}

function placeOrder(itemID, DesiredItemQty, totalPrice) {
    connection.query('UPDATE bamazon_db.products SET stock_qty = stock_qty - ?, product_sales = product_sales + ? WHERE item_id = ? ', [DesiredItemQty, DesiredItemQty, itemID], function(error, results, fields) {
        console.log('Order placed! Your total is $' + totalPrice)
        rootMenu()
    });
}


