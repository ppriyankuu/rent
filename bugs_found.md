**Bug01: Tenant Reactivation and Status Inconsistency**

Currently, when an admin **deactivates a tenant**, there is **no option to reactivate the tenant** from the admin panel. The admin interface only shows **View** and **Delete** actions for a deactivated tenant. A **Reactivate** button should be available alongside these actions, and it should properly restore the tenant's active status.

Additionally, there is a **status inconsistency issue**:

* Even after being **deactivated**, the tenant is still able to **book a bed and pay rent** from their dashboard.
* Once they perform these actions, their **dashboard shows their status as "Active"**.
* However, in the **admin tenants page**, the same tenant still appears with the **status "Inactive"**.

**Expected behavior:**

1. Admins should have a **Reactivate** option for deactivated tenants.
2. A **deactivated tenant should not be able to book a bed or make rent payments**.
3. The **tenant status must remain consistent** between the tenant dashboard and the admin panel.

**Bug 02: Missing Option to Delete Beds When Creating or Editing Rooms**

Currently, the admin panel allows adding new rooms and editing existing rooms. However, there is no option to delete a bed once it has been added.

**Current Issues:**

1. *Create Room Modal*
- The interface allows adding new beds.
- However, there is no option to remove a bed if it was added by mistake.

2. *Edit Room Modal*
- When editing an existing room, admins cannot delete any existing bed.
- This makes it impossible to adjust room configurations, such as converting a 3-bed room into a 2-bed room.

**Expected Behavior:**

- Both the Create Room and Edit Room modals should provide a Delete/Remove button for each bed.
- Admins should be able to remove beds that were added mistakenly or when changing the room configuration.

**Additional Consideration:**

- If a bed is currently assigned to a tenant or has an active booking, the system should either:
    - Prevent deletion with a clear message, or
    -Require the admin to free the bed before deleting it.

**Bug 03: Tenant Dashboard Does Not Show Rent Payment Window or Late Fee Information**

Currently, the **Tenant Dashboard** → **Booking Details** section displays the next rent due date, but it does not show the rent payment window or late fee information, even though these values are configured in the Admin Settings.

**Current Behavior:**
- Tenants can see the next due date for rent payment.
- However, they cannot see:
    - The payment window (start day → end day).
    - The number of days available to pay the rent.
    - The late fee amount that will be charged if payment is made after the allowed window.

**Expected Behavior:**

- In the Booking Details section of the Tenant Dashboard, along with the Next Due Date, the following information should also be displayed:

    - Rent Payment Window
        *Example: “Rent can be paid between the 1st and 5th of every month (5 days window)”*
    - Late Fee Information
        *Example: “A late fee of ₹300 will be applied if payment is made after the payment window.”*

**Purpose:**
This helps tenants clearly understand:
- When they are allowed to pay rent
- How many days they have to complete the payment
- The penalty for late payment

Displaying this information will reduce confusion and unnecessary support queries from tenants.

### Bug 04: Razorpay does not show UPI as a payment option

Razorpay is currently **not showing UPI as a payment option** during checkout.

Possible reason: I might be using **Razorpay test API keys**, but I am not sure if that is the actual cause.

Please:

1. Investigate why **UPI is not appearing in the Razorpay payment options**.
2. Check whether this behavior is expected when using **test mode API keys**.
3. Verify the Razorpay integration code and configuration.
4. Identify if any **required options, parameters, or dashboard settings** are missing.
5. Suggest and implement the correct fix so that **UPI appears properly in the payment options**.

---

### UI Refinement

Please **refine and improve the existing UI** to make it **clean, polished, and visually appealing**.

Important requirements:

* **Do NOT add any dark theme**.
* **Do NOT add any theme toggle**.
* Simply **improve the current light UI** with better spacing, alignment, layout, and visual polish.

---

### Important Note

While fixing the bug and refining the UI:

* **Do NOT break any existing functionality.**
* Ensure that **all existing features continue to work exactly as before**.
* The **application must remain stable across all pages**.
* Any improvements should be **non-breaking and safe**.

Make sure the project **continues to build and run correctly after all changes**.
