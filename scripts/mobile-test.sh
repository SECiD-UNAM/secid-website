#!/bin/bash

# Mobile Testing Script for SECiD Platform
# Comprehensive mobile responsiveness and touch interaction testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_URL="${TEST_URL:-http://localhost:4321}"
RESULTS_DIR="test-results"
SCREENSHOTS_DIR="$RESULTS_DIR/screenshots"
REPORTS_DIR="$RESULTS_DIR/reports"
PLAYWRIGHT_REPORT_DIR="playwright-report"

# Create directories
mkdir -p "$RESULTS_DIR" "$SCREENSHOTS_DIR" "$REPORTS_DIR"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if server is running
check_server() {
    print_status "Checking if test server is running at $TEST_URL..."
    
    if curl -s --head "$TEST_URL" > /dev/null; then
        print_success "Server is running at $TEST_URL"
        return 0
    else
        print_warning "Server not running at $TEST_URL"
        return 1
    fi
}

# Function to start development server
start_dev_server() {
    print_status "Starting development server..."
    
    if command -v npm &> /dev/null; then
        # Check if package.json exists
        if [ ! -f "package.json" ]; then
            print_error "package.json not found. Please run this script from the project root."
            exit 1
        fi
        
        # Start the preview server in the background
        print_status "Building project..."
        npm run build > /dev/null 2>&1 || {
            print_error "Failed to build project"
            exit 1
        }
        
        print_status "Starting preview server..."
        npm run preview &
        SERVER_PID=$!
        
        # Wait for server to start
        for i in {1..30}; do
            if check_server; then
                break
            fi
            print_status "Waiting for server to start... ($i/30)"
            sleep 2
        done
        
        if ! check_server; then
            print_error "Server failed to start after 60 seconds"
            kill $SERVER_PID 2>/dev/null || true
            exit 1
        fi
        
        print_success "Development server started (PID: $SERVER_PID)"
    else
        print_error "npm not found. Please install Node.js and npm."
        exit 1
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Checking Playwright installation..."
    
    if ! npx playwright --version &> /dev/null; then
        print_status "Installing Playwright..."
        npx playwright install
    fi
    
    # Install additional browsers if needed
    print_status "Installing Playwright browsers..."
    npx playwright install chromium webkit firefox
    
    print_success "Dependencies installed"
}

# Function to run mobile tests
run_mobile_tests() {
    local test_type="$1"
    local test_pattern="$2"
    
    print_status "Running $test_type tests..."
    
    case "$test_type" in
        "all")
            npx playwright test tests/mobile/ --reporter=html --reporter=json --reporter=junit
            ;;
        "suite")
            npx playwright test tests/mobile/mobile-test-suite.ts --reporter=html
            ;;
        "viewport")
            npx playwright test tests/mobile/viewport-tests.ts --reporter=html
            ;;
        "touch")
            npx playwright test tests/mobile/touch-events.ts --reporter=html
            ;;
        "specific")
            npx playwright test "$test_pattern" --reporter=html
            ;;
        "headed")
            npx playwright test tests/mobile/ --headed --reporter=html
            ;;
        "debug")
            npx playwright test tests/mobile/ --debug
            ;;
        *)
            print_error "Unknown test type: $test_type"
            return 1
            ;;
    esac
}

# Function to run performance tests
run_performance_tests() {
    print_status "Running mobile performance tests..."
    
    # Lighthouse mobile audit
    if command -v lighthouse &> /dev/null; then
        print_status "Running Lighthouse mobile audit..."
        lighthouse "$TEST_URL" \
            --preset=mobile \
            --output=html \
            --output=json \
            --output-path="$REPORTS_DIR/lighthouse-mobile" \
            --chrome-flags="--headless" \
            --quiet
        
        print_success "Lighthouse audit completed"
    else
        print_warning "Lighthouse not found. Skipping performance audit."
        print_status "Install with: npm install -g lighthouse"
    fi
    
    # Custom performance tests with Playwright
    npx playwright test tests/mobile/mobile-test-suite.ts --grep "Performance" --reporter=html
}

# Function to run accessibility tests
run_accessibility_tests() {
    print_status "Running mobile accessibility tests..."
    
    # Run accessibility-focused tests
    npx playwright test tests/mobile/ --grep "Accessibility" --reporter=html
    
    print_success "Accessibility tests completed"
}

# Function to run network condition tests
run_network_tests() {
    print_status "Running network condition tests..."
    
    # Run tests with different network conditions
    npx playwright test tests/mobile/mobile-test-suite.ts --grep "network" --reporter=html
    
    print_success "Network condition tests completed"
}

# Function to generate comprehensive report
generate_report() {
    print_status "Generating comprehensive mobile testing report..."
    
    cat > "$REPORTS_DIR/mobile-test-summary.md" << EOF
# Mobile Testing Report - $(date)

## Test Summary

### Environment
- Test URL: $TEST_URL
- Test Date: $(date)
- Platform: $(uname -s)
- Node Version: $(node --version 2>/dev/null || echo "Not available")

### Test Results

#### Mobile Responsiveness
- Viewport Tests: See playwright-report for detailed results
- Touch Event Tests: See playwright-report for detailed results
- Performance Tests: Check lighthouse-mobile.html for performance metrics

#### Screenshots
Screenshots of different device viewports are available in:
\`$SCREENSHOTS_DIR/\`

#### Detailed Reports
- HTML Report: \`$PLAYWRIGHT_REPORT_DIR/index.html\`
- JSON Results: \`test-results/results.json\`
- JUnit Report: \`test-results/junit.xml\`

### Recommendations

1. Review any failed tests in the HTML report
2. Check performance metrics in Lighthouse report
3. Verify screenshots for visual consistency across devices
4. Address any accessibility issues found

### Next Steps

- Fix any critical issues identified
- Re-run tests after fixes
- Consider adding more device-specific tests if needed

EOF

    print_success "Report generated: $REPORTS_DIR/mobile-test-summary.md"
}

# Function to open reports
open_reports() {
    print_status "Opening test reports..."
    
    # Open HTML report if available
    if [ -f "$PLAYWRIGHT_REPORT_DIR/index.html" ]; then
        if command -v xdg-open &> /dev/null; then
            xdg-open "$PLAYWRIGHT_REPORT_DIR/index.html"
        elif command -v open &> /dev/null; then
            open "$PLAYWRIGHT_REPORT_DIR/index.html"
        else
            print_status "HTML report available at: file://$(pwd)/$PLAYWRIGHT_REPORT_DIR/index.html"
        fi
    fi
    
    # Open Lighthouse report if available
    if [ -f "$REPORTS_DIR/lighthouse-mobile.html" ]; then
        if command -v xdg-open &> /dev/null; then
            xdg-open "$REPORTS_DIR/lighthouse-mobile.html"
        elif command -v open &> /dev/null; then
            open "$REPORTS_DIR/lighthouse-mobile.html"
        else
            print_status "Lighthouse report available at: file://$(pwd)/$REPORTS_DIR/lighthouse-mobile.html"
        fi
    fi
}

# Function to cleanup
cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        print_status "Stopping development server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
        print_success "Server stopped"
    fi
}

# Function to show help
show_help() {
    cat << EOF
Mobile Testing Script for SECiD Platform

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    install         Install testing dependencies
    test [TYPE]     Run mobile tests
    performance     Run performance tests only
    accessibility   Run accessibility tests only
    network         Run network condition tests
    report          Generate test report
    open            Open test reports
    help            Show this help message

Test Types:
    all            Run all mobile tests (default)
    suite          Run main mobile test suite only
    viewport       Run viewport tests only
    touch          Run touch event tests only
    headed         Run tests with browser UI visible
    debug          Run tests in debug mode
    specific PATH  Run specific test file

Options:
    --url URL      Set test URL (default: http://localhost:4321)
    --no-server    Don't start development server
    --keep-server  Don't stop server after tests

Environment Variables:
    TEST_URL       Override default test URL
    CI             Set to 'true' for CI environment

Examples:
    $0 install                    # Install dependencies
    $0 test                       # Run all tests
    $0 test viewport              # Run viewport tests only
    $0 test headed                # Run tests with browser visible
    $0 performance                # Run performance tests
    $0 --url http://localhost:3000 test  # Test different URL

EOF
}

# Main execution
main() {
    local command="test"
    local test_type="all"
    local start_server=true
    local keep_server=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            install)
                command="install"
                shift
                ;;
            test)
                command="test"
                if [[ $# -gt 1 && ! $2 =~ ^-- ]]; then
                    test_type="$2"
                    shift
                fi
                shift
                ;;
            performance)
                command="performance"
                shift
                ;;
            accessibility)
                command="accessibility"
                shift
                ;;
            network)
                command="network"
                shift
                ;;
            report)
                command="report"
                shift
                ;;
            open)
                command="open"
                shift
                ;;
            help|--help|-h)
                show_help
                exit 0
                ;;
            --url)
                TEST_URL="$2"
                shift 2
                ;;
            --no-server)
                start_server=false
                shift
                ;;
            --keep-server)
                keep_server=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Set up trap for cleanup
    trap cleanup EXIT
    
    # Execute command
    case "$command" in
        install)
            install_dependencies
            ;;
        test)
            install_dependencies
            
            if [ "$start_server" = true ] && ! check_server; then
                start_dev_server
            fi
            
            run_mobile_tests "$test_type"
            generate_report
            
            if [ "$keep_server" = false ]; then
                cleanup
            fi
            
            print_success "Mobile testing completed!"
            print_status "View results with: $0 open"
            ;;
        performance)
            install_dependencies
            
            if [ "$start_server" = true ] && ! check_server; then
                start_dev_server
            fi
            
            run_performance_tests
            generate_report
            
            print_success "Performance testing completed!"
            ;;
        accessibility)
            install_dependencies
            
            if [ "$start_server" = true ] && ! check_server; then
                start_dev_server
            fi
            
            run_accessibility_tests
            generate_report
            
            print_success "Accessibility testing completed!"
            ;;
        network)
            install_dependencies
            
            if [ "$start_server" = true ] && ! check_server; then
                start_dev_server
            fi
            
            run_network_tests
            generate_report
            
            print_success "Network testing completed!"
            ;;
        report)
            generate_report
            ;;
        open)
            open_reports
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"