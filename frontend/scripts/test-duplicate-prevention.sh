#!/bin/bash

# Test script for duplicate item prevention
echo "🧪 Running tests for duplicate item prevention..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Function to run tests and capture results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "${YELLOW}Running: $test_name${NC}"
    
    if eval "$test_command"; then
        print_status 0 "$test_name passed"
        return 0
    else
        print_status 1 "$test_name failed"
        return 1
    fi
}

# Initialize counters
total_tests=0
passed_tests=0

# Component Tests (these work with the current setup)
echo -e "\n${YELLOW}🧩 Running Component Tests...${NC}"

# ListItem Tests
total_tests=$((total_tests + 1))
if run_test "ListItem Component Tests" "npm test ListItem.test.tsx"; then
    passed_tests=$((passed_tests + 1))
fi

# AddItemForm Tests
total_tests=$((total_tests + 1))
if run_test "AddItemForm Component Tests" "npm test AddItemForm.test.tsx"; then
    passed_tests=$((passed_tests + 1))
fi

# LocalCacheContext Tests
total_tests=$((total_tests + 1))
if run_test "LocalCacheContext Tests" "npm test LocalCacheContext.test.tsx"; then
    passed_tests=$((passed_tests + 1))
fi

# RecentListsSection Tests
total_tests=$((total_tests + 1))
if run_test "RecentListsSection Tests" "npm test RecentListsSection.test.tsx"; then
    passed_tests=$((passed_tests + 1))
fi

# ExpirationIndicator Tests
total_tests=$((total_tests + 1))
if run_test "ExpirationIndicator Tests" "npm test ExpirationIndicator.test.tsx"; then
    passed_tests=$((passed_tests + 1))
fi

# Manual Test Instructions
echo -e "\n${YELLOW}📋 Manual Testing Instructions${NC}"
echo "=================================="
echo "1. Open the test tool: http://localhost:3000/test-duplicate-prevention.html"
echo "2. Click 'Start Test' to run automated API tests"
echo "3. Or manually test by:"
echo "   - Create a list and add 'apple'"
echo "   - Go back and create another list"
echo "   - Add 'beer' to the second list"
echo "   - Verify 'beer' appears only once"

# Application Status Check
echo -e "\n${YELLOW}🔍 Application Status Check${NC}"
echo "=================================="

# Check if frontend is running
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    print_status 0 "Frontend is running (http://localhost:3000)"
else
    print_status 1 "Frontend is NOT running (http://localhost:3000)"
fi

# Check if backend is running
if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
    print_status 0 "Backend is running (http://localhost:8080)"
else
    print_status 1 "Backend is NOT running (http://localhost:8080)"
fi

# Summary
echo -e "\n${YELLOW}📊 Test Summary${NC}"
echo "=================================="
echo "Total Automated Tests: $total_tests"
echo "Passed: $passed_tests"
echo "Failed: $((total_tests - passed_tests))"

if [ $passed_tests -eq $total_tests ]; then
    echo -e "${GREEN}🎉 All automated tests passed!${NC}"
    echo -e "${YELLOW}📝 Please run manual tests using the instructions above${NC}"
    exit 0
else
    echo -e "${RED}💥 Some automated tests failed!${NC}"
    exit 1
fi