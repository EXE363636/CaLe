# Requirements Document

## Introduction

CaLẻ / ShiftNow is a responsive web platform that connects employers who need short-term workers for shifts lasting one day or a few hours with students, freelancers, and individuals seeking flexible extra income in Vietnam. The platform manages trust through worker verification, reputation scoring, and employer payment deposits, while simulating escrow payment processing for the MVP phase.

## Glossary

- **Platform**: The CaLẻ / ShiftNow web application system
- **Employer**: A user who posts shift opportunities and hires workers
- **Worker**: A user who applies for and performs shift work
- **Admin**: A user with administrative privileges to manage the platform
- **Shift**: A short-term work opportunity posted by an employer with specific date, time, location, and wage
- **Reputation_Score**: A numerical value representing a worker's reliability and performance history
- **Deposit**: The wage amount that an employer must pay before a shift is published
- **Escrow_Status**: The current state of payment in the simulated escrow system
- **Check_In**: The action a worker takes to confirm arrival at a shift location
- **Check_Out**: The action a worker takes to confirm completion of a shift
- **No_Show**: When an approved worker fails to check in for a shift
- **Late_Cancel**: When a worker cancels an approved shift within a restricted timeframe
- **Verification_Status**: The level of identity verification a worker has completed (phone, ID, student card)
- **Application**: A worker's request to be assigned to a specific shift
- **Approval**: An employer's acceptance of a worker's application
- **Completion_Confirmation**: An employer's acknowledgment that a shift was completed satisfactorily
- **Dispute**: A disagreement between employer and worker requiring admin review
- **Boost_Credit**: A promotional benefit given to employers for reposting shifts after worker no-shows

## Requirements

### Requirement 1: User Authentication and Role Management

**User Story:** As a user, I want to register and log in with a specific role, so that I can access role-appropriate features.

#### Acceptance Criteria

1. THE Platform SHALL provide registration for three user roles: Employer, Worker, and Admin
2. WHEN a user registers, THE Platform SHALL collect email, password, phone number, and role selection
3. WHEN a user logs in with valid credentials, THE Platform SHALL authenticate the user and redirect to the role-appropriate dashboard
4. WHEN a user logs in with invalid credentials, THE Platform SHALL display an error message and prevent access
5. THE Platform SHALL maintain separate session states for Employer, Worker, and Admin roles

### Requirement 2: Worker Verification System

**User Story:** As a worker, I want to verify my identity, so that I can build trust and access more shift opportunities.

#### Acceptance Criteria

1. THE Platform SHALL require phone number verification for all workers before applying to shifts
2. WHEN a worker completes phone verification, THE Platform SHALL update the Verification_Status to "Phone Verified"
3. THE Platform SHALL allow workers to optionally upload ID or student card documents for additional verification
4. WHEN a worker uploads verification documents, THE Platform SHALL update the Verification_Status to include "ID Verified" or "Student Verified"
5. THE Platform SHALL display Verification_Status on worker profiles visible to employers

### Requirement 3: Shift Creation and Publishing

**User Story:** As an employer, I want to post shift opportunities with detailed information, so that I can attract suitable workers.

#### Acceptance Criteria

1. THE Platform SHALL allow employers to create shifts with job title, location, date, time, wage per hour, number of workers needed, job description, and requirements
2. WHEN an employer creates a shift, THE Platform SHALL calculate the total deposit amount as (wage per hour × hours × number of workers)
3. THE Platform SHALL prevent shift publication until the employer completes the simulated deposit
4. WHEN an employer completes the simulated deposit, THE Platform SHALL set Escrow_Status to "Deposited" and publish the shift
5. THE Platform SHALL display published shifts on the shift listing page with all shift details visible

### Requirement 4: Shift Discovery and Filtering

**User Story:** As a worker, I want to browse and filter available shifts, so that I can find opportunities that match my preferences.

#### Acceptance Criteria

1. THE Platform SHALL display all published shifts with Escrow_Status "Deposited" on the shift listing page
2. THE Platform SHALL provide filters for location, date range, wage range, and job type
3. WHEN a worker applies filters, THE Platform SHALL display only shifts matching all selected filter criteria
4. THE Platform SHALL display shift cards showing job title, location, date, time, wage, and number of positions available
5. WHEN a worker clicks a shift card, THE Platform SHALL navigate to the shift detail page

### Requirement 5: Shift Application Process

**User Story:** As a worker, I want to apply for shifts, so that I can secure work opportunities.

#### Acceptance Criteria

1. WHEN a worker with phone verification views a shift detail page, THE Platform SHALL display an "Apply" button
2. WHEN a worker without phone verification views a shift detail page, THE Platform SHALL display a message requiring verification
3. WHEN a worker clicks "Apply", THE Platform SHALL create an Application with status "Pending"
4. THE Platform SHALL prevent workers from applying to shifts with time conflicts with their approved shifts
5. THE Platform SHALL display all worker applications on the worker dashboard with application status

### Requirement 6: Worker Approval and Rejection

**User Story:** As an employer, I want to review and approve worker applications, so that I can select suitable workers for my shifts.

#### Acceptance Criteria

1. THE Platform SHALL display all applications for each shift on the employer dashboard
2. THE Platform SHALL show worker Verification_Status and Reputation_Score for each applicant
3. WHEN an employer approves an application, THE Platform SHALL update the application status to "Approved" and decrement available positions
4. WHEN available positions reach zero, THE Platform SHALL mark the shift as "Fully Booked" and hide the apply button
5. WHEN an employer rejects an application, THE Platform SHALL update the application status to "Rejected" and notify the worker

### Requirement 7: Check-In and Check-Out System

**User Story:** As a worker, I want to check in and check out of shifts, so that I can confirm my attendance and completion.

#### Acceptance Criteria

1. WHEN a shift start time is within 30 minutes, THE Platform SHALL enable the check-in button for approved workers
2. WHEN a worker clicks check-in, THE Platform SHALL record the check-in timestamp and update shift status to "In Progress"
3. WHEN a shift end time has passed, THE Platform SHALL enable the check-out button for checked-in workers
4. WHEN a worker clicks check-out, THE Platform SHALL record the check-out timestamp and update shift status to "Awaiting Confirmation"
5. IF a worker fails to check in within 15 minutes after shift start time, THEN THE Platform SHALL mark the worker as No_Show

### Requirement 8: Reputation Score Management

**User Story:** As a worker, I want to maintain a reputation score, so that employers can trust my reliability.

#### Acceptance Criteria

1. THE Platform SHALL initialize new worker accounts with a Reputation_Score of 100
2. WHEN a worker completes a shift and receives employer confirmation, THE Platform SHALL increase Reputation_Score by 5 points
3. WHEN a worker is marked as No_Show, THE Platform SHALL decrease Reputation_Score by 20 points
4. WHEN a worker performs Late_Cancel (within 24 hours of shift start), THE Platform SHALL decrease Reputation_Score by 10 points
5. IF Reputation_Score falls below 50, THEN THE Platform SHALL restrict the worker from applying to new shifts until score improves

### Requirement 9: Employer Shift Completion Confirmation

**User Story:** As an employer, I want to confirm shift completion, so that workers can receive payment and ratings.

#### Acceptance Criteria

1. WHEN a worker checks out, THE Platform SHALL display the shift on employer dashboard as "Awaiting Confirmation"
2. THE Platform SHALL allow employers to confirm completion or report issues for each checked-out worker
3. WHEN an employer confirms completion, THE Platform SHALL update Escrow_Status to "Released" for that worker's payment
4. WHEN an employer confirms completion, THE Platform SHALL prompt the employer to rate the worker (1-5 stars) and provide optional feedback
5. WHEN an employer reports an issue, THE Platform SHALL create a Dispute and set Escrow_Status to "Disputed"

### Requirement 10: Simulated Escrow Payment System

**User Story:** As a user, I want to see realistic payment flow simulation, so that I can understand how the payment system will work.

#### Acceptance Criteria

1. THE Platform SHALL support Escrow_Status values: "Pending Deposit", "Deposited", "In Progress", "Completed", "Released", "Disputed", "Refunded"
2. WHEN an employer creates a shift, THE Platform SHALL set Escrow_Status to "Pending Deposit"
3. WHEN an employer completes simulated deposit, THE Platform SHALL set Escrow_Status to "Deposited"
4. WHEN a worker checks in, THE Platform SHALL set Escrow_Status to "In Progress"
5. WHEN an employer confirms completion, THE Platform SHALL set Escrow_Status to "Released" and display payment as transferred to worker
6. WHEN a worker is marked as No_Show, THE Platform SHALL set Escrow_Status to "Refunded" for that worker's portion

### Requirement 11: No-Show Handling and Employer Compensation

**User Story:** As an employer, I want automatic handling of worker no-shows, so that I receive compensation and can find replacement workers.

#### Acceptance Criteria

1. WHEN a worker is marked as No_Show, THE Platform SHALL automatically refund the employer for that worker's wage portion
2. WHEN a worker is marked as No_Show, THE Platform SHALL grant the employer one Boost_Credit
3. THE Platform SHALL allow employers to use Boost_Credit to promote shift reposts or increase visibility
4. THE Platform SHALL send notifications to employers when a No_Show occurs
5. THE Platform SHALL display No_Show incidents on the worker's profile visible to employers

### Requirement 12: Worker Cancellation Policy

**User Story:** As a worker, I want to cancel applications when necessary, so that I can manage my schedule while understanding the consequences.

#### Acceptance Criteria

1. THE Platform SHALL allow workers to cancel "Pending" applications without penalty
2. THE Platform SHALL allow workers to cancel "Approved" applications more than 24 hours before shift start without Reputation_Score penalty
3. WHEN a worker cancels an "Approved" application within 24 hours of shift start, THE Platform SHALL classify it as Late_Cancel
4. WHEN a Late_Cancel occurs, THE Platform SHALL increment available positions for the shift and notify the employer
5. THE Platform SHALL display cancellation history on worker profiles

### Requirement 13: Rating and Review System

**User Story:** As an employer, I want to rate workers after shift completion, so that other employers can make informed decisions.

#### Acceptance Criteria

1. THE Platform SHALL allow employers to rate workers on a scale of 1 to 5 stars after Completion_Confirmation
2. THE Platform SHALL allow employers to provide optional text feedback with ratings
3. THE Platform SHALL calculate and display average rating for each worker based on all received ratings
4. THE Platform SHALL display the number of completed shifts and average rating on worker profiles
5. THE Platform SHALL prevent employers from editing ratings after submission

### Requirement 14: Admin User Management

**User Story:** As an admin, I want to manage user accounts, so that I can maintain platform integrity.

#### Acceptance Criteria

1. THE Platform SHALL display all registered users (Employers and Workers) on the admin dashboard
2. THE Platform SHALL allow admins to view detailed user profiles including Verification_Status, Reputation_Score, and activity history
3. THE Platform SHALL allow admins to suspend or reactivate user accounts
4. WHEN an admin suspends a user account, THE Platform SHALL prevent that user from logging in and display a suspension message
5. THE Platform SHALL allow admins to manually adjust Reputation_Score with a reason note

### Requirement 15: Admin Shift and Payment Management

**User Story:** As an admin, I want to oversee shifts and payments, so that I can resolve issues and ensure platform operations.

#### Acceptance Criteria

1. THE Platform SHALL display all shifts with their current status and Escrow_Status on the admin dashboard
2. THE Platform SHALL allow admins to view all applications and approvals for any shift
3. THE Platform SHALL allow admins to manually change Escrow_Status with a reason note
4. THE Platform SHALL display all Disputes on the admin dashboard with employer and worker details
5. WHEN an admin resolves a Dispute, THE Platform SHALL allow setting Escrow_Status to either "Released" or "Refunded" with resolution notes

### Requirement 16: Responsive Landing Page

**User Story:** As a visitor, I want to understand the platform quickly, so that I can decide whether to register as an employer or worker.

#### Acceptance Criteria

1. THE Platform SHALL display a landing page with Vietnamese content explaining the platform purpose
2. THE Platform SHALL display separate call-to-action buttons for "Đăng ký Nhà tuyển dụng" (Register as Employer) and "Đăng ký Người làm" (Register as Worker)
3. THE Platform SHALL display benefits for employers including "Tìm người nhanh", "Thanh toán an toàn", "Đánh giá uy tín"
4. THE Platform SHALL display benefits for workers including "Làm linh hoạt", "Nhận tiền nhanh", "Không cần đặt cọc"
5. THE Platform SHALL display a "How It Works" section with step-by-step process for both employers and workers

### Requirement 17: Responsive Design and Mobile Optimization

**User Story:** As a user on any device, I want the platform to work smoothly, so that I can access features on desktop or mobile.

#### Acceptance Criteria

1. THE Platform SHALL render all pages responsively using mobile-first design principles
2. WHEN viewed on mobile devices (width < 768px), THE Platform SHALL display navigation as a hamburger menu
3. WHEN viewed on mobile devices, THE Platform SHALL stack form fields and cards vertically for optimal readability
4. THE Platform SHALL ensure all interactive elements (buttons, links, inputs) have minimum touch target size of 44x44 pixels on mobile
5. THE Platform SHALL load and render pages within 3 seconds on 3G mobile connections

### Requirement 18: Notification System

**User Story:** As a user, I want to receive notifications about important events, so that I can stay informed about my shifts and applications.

#### Acceptance Criteria

1. WHEN a worker's application is approved or rejected, THE Platform SHALL display a notification on the worker dashboard
2. WHEN a shift receives a new application, THE Platform SHALL display a notification on the employer dashboard
3. WHEN a worker is marked as No_Show, THE Platform SHALL display a notification on both employer and worker dashboards
4. WHEN an employer confirms shift completion, THE Platform SHALL display a notification on the worker dashboard
5. THE Platform SHALL display an unread notification count badge on the dashboard navigation

### Requirement 19: Search Functionality

**User Story:** As a worker, I want to search for shifts by keywords, so that I can quickly find relevant opportunities.

#### Acceptance Criteria

1. THE Platform SHALL provide a search input field on the shift listing page
2. WHEN a worker enters search keywords, THE Platform SHALL filter shifts by matching job title, location, or job description
3. THE Platform SHALL display search results in real-time as the worker types
4. THE Platform SHALL combine search keywords with active filters to narrow results
5. WHEN no shifts match the search criteria, THE Platform SHALL display a "Không tìm thấy ca làm phù hợp" message

### Requirement 20: Dashboard Analytics and Statistics

**User Story:** As an employer, I want to see statistics about my posted shifts, so that I can track my hiring activity.

#### Acceptance Criteria

1. THE Platform SHALL display total number of posted shifts on the employer dashboard
2. THE Platform SHALL display total number of completed shifts on the employer dashboard
3. THE Platform SHALL display total amount deposited and total amount paid out on the employer dashboard
4. THE Platform SHALL display average worker rating given by the employer
5. THE Platform SHALL display a list of upcoming shifts with application counts

### Requirement 21: Worker Dashboard Statistics

**User Story:** As a worker, I want to see my work statistics, so that I can track my progress and earnings.

#### Acceptance Criteria

1. THE Platform SHALL display total number of completed shifts on the worker dashboard
2. THE Platform SHALL display total earnings (sum of all released payments) on the worker dashboard
3. THE Platform SHALL display current Reputation_Score prominently on the worker dashboard
4. THE Platform SHALL display average rating received from employers on the worker dashboard
5. THE Platform SHALL display upcoming approved shifts with check-in status

### Requirement 22: Shift Time Conflict Prevention

**User Story:** As a worker, I want to be prevented from double-booking shifts, so that I can avoid scheduling conflicts.

#### Acceptance Criteria

1. WHEN a worker attempts to apply for a shift, THE Platform SHALL check for time overlaps with approved shifts
2. IF a time conflict exists with an approved shift, THEN THE Platform SHALL prevent the application and display a conflict message
3. THE Platform SHALL define time conflict as any overlap between shift start and end times including 1-hour buffer before and after
4. THE Platform SHALL allow applications to shifts that are pending or rejected regardless of time overlap
5. THE Platform SHALL display conflicting shift details in the conflict message

### Requirement 23: Employer Profile and Company Information

**User Story:** As an employer, I want to create a company profile, so that workers can learn about my business before applying.

#### Acceptance Criteria

1. THE Platform SHALL allow employers to add company name, business type, description, and logo to their profile
2. THE Platform SHALL display employer profile information on shift detail pages
3. THE Platform SHALL display employer's total posted shifts and average rating from workers on the profile
4. THE Platform SHALL allow employers to edit their profile information at any time
5. THE Platform SHALL display employer Verification_Status (verified business or individual)

### Requirement 24: Worker Profile and Portfolio

**User Story:** As a worker, I want to create a detailed profile, so that employers can evaluate my suitability for shifts.

#### Acceptance Criteria

1. THE Platform SHALL allow workers to add profile photo, bio, skills, and work preferences
2. THE Platform SHALL display worker profile information to employers reviewing applications
3. THE Platform SHALL display worker's completed shift count, Reputation_Score, average rating, and Verification_Status on the profile
4. THE Platform SHALL allow workers to list preferred job types and locations
5. THE Platform SHALL display worker's rating history and feedback from employers on the profile

### Requirement 25: Shift Editing and Cancellation by Employer

**User Story:** As an employer, I want to edit or cancel shifts before they start, so that I can adjust to changing business needs.

#### Acceptance Criteria

1. THE Platform SHALL allow employers to edit shift details (except wage and date) up to 24 hours before shift start time
2. WHEN an employer edits a shift with approved workers, THE Platform SHALL notify all approved workers of the changes
3. THE Platform SHALL allow employers to cancel shifts up to 24 hours before shift start time
4. WHEN an employer cancels a shift, THE Platform SHALL refund the simulated deposit and set Escrow_Status to "Refunded"
5. WHEN an employer cancels a shift with approved workers, THE Platform SHALL notify all approved workers and remove the shift from their schedules

### Requirement 26: Admin Reporting and Analytics

**User Story:** As an admin, I want to view platform analytics, so that I can monitor platform health and growth.

#### Acceptance Criteria

1. THE Platform SHALL display total number of registered employers on the admin dashboard
2. THE Platform SHALL display total number of registered workers on the admin dashboard
3. THE Platform SHALL display total number of posted shifts on the admin dashboard
4. THE Platform SHALL display total number of completed shifts on the admin dashboard
5. THE Platform SHALL display number of active Disputes on the admin dashboard

### Requirement 27: Vietnamese Localization

**User Story:** As a Vietnamese user, I want all interface text in Vietnamese, so that I can easily understand and use the platform.

#### Acceptance Criteria

1. THE Platform SHALL display all user interface labels, buttons, and messages in Vietnamese
2. THE Platform SHALL format currency values in Vietnamese Dong (₫) with proper thousand separators
3. THE Platform SHALL format dates and times according to Vietnamese conventions (DD/MM/YYYY)
4. THE Platform SHALL use Vietnamese terminology for all business concepts (ca làm, nhà tuyển dụng, người làm)
5. THE Platform SHALL display error messages and validation feedback in Vietnamese

### Requirement 28: Form Validation and Error Handling

**User Story:** As a user, I want clear validation feedback, so that I can correct errors when filling out forms.

#### Acceptance Criteria

1. WHEN a user submits a form with missing required fields, THE Platform SHALL display field-specific error messages in Vietnamese
2. WHEN a user enters invalid data format (email, phone, date), THE Platform SHALL display format requirements
3. THE Platform SHALL validate phone numbers according to Vietnamese phone number format
4. THE Platform SHALL prevent form submission until all validation errors are resolved
5. THE Platform SHALL display success messages after successful form submissions

### Requirement 29: Shift Visibility and Status Management

**User Story:** As an employer, I want to control shift visibility, so that I can manage when shifts appear to workers.

#### Acceptance Criteria

1. THE Platform SHALL keep shifts in "Draft" status until employer completes simulated deposit
2. WHEN Escrow_Status changes to "Deposited", THE Platform SHALL automatically publish the shift and make it visible to workers
3. WHEN a shift becomes fully booked, THE Platform SHALL keep it visible but disable the apply button
4. WHEN a shift start time has passed, THE Platform SHALL remove it from the main shift listing page
5. THE Platform SHALL allow employers to view all their shifts regardless of status on their dashboard

### Requirement 30: Security and Data Protection

**User Story:** As a user, I want my data to be secure, so that I can trust the platform with my personal information.

#### Acceptance Criteria

1. THE Platform SHALL hash all passwords using bcrypt before storing in the database
2. THE Platform SHALL implement session timeout after 24 hours of inactivity
3. THE Platform SHALL prevent cross-site scripting (XSS) by sanitizing all user-generated content before display
4. THE Platform SHALL implement CSRF protection for all form submissions
5. THE Platform SHALL use HTTPS for all data transmission in production environment

---

## Notes

This requirements document defines the MVP scope for CaLẻ / ShiftNow platform. The focus is on core functionality with simulated payment processing. Real payment gateway integration, SMS verification, and advanced features like in-app messaging will be addressed in future iterations.

The platform prioritizes trust-building through verification, reputation scoring, and transparent payment status tracking while maintaining a simple, mobile-friendly user experience suitable for the Vietnamese market.
