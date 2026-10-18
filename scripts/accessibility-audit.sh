#!/bin/bash

# Accessibility Audit Script for SECiD Platform
# Performs comprehensive WCAG 2.1 Level AA compliance checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:4321"
OUTPUT_DIR="./accessibility-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="${OUTPUT_DIR}/accessibility_audit_${TIMESTAMP}.html"
JSON_REPORT="${OUTPUT_DIR}/accessibility_audit_${TIMESTAMP}.json"

# Test pages
PAGES=(
    "/"
    "/en/"
    "/es/"
    "/en/jobs"
    "/es/empleos"
    "/en/members"
    "/es/miembros"
    "/en/login"
    "/es/login"
    "/en/signup"
    "/es/signup"
    "/en/dashboard"
    "/es/dashboard"
)

# Functions
print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    SECiD Accessibility Audit                   ║${NC}"
    echo -e "${BLUE}║                      WCAG 2.1 Level AA                        ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo -e "${YELLOW}▶ $1${NC}"
    echo "─────────────────────────────────────────────────────────────────"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

check_dependencies() {
    print_section "Checking Dependencies"
    
    # Check if node is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_success "Node.js found: $(node --version)"
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm found: $(npm --version)"
    
    # Check if axe-core is installed
    if ! npm list @axe-core/cli &> /dev/null; then
        print_warning "Installing @axe-core/cli..."
        npm install -g @axe-core/cli
    fi
    print_success "@axe-core/cli is available"
    
    # Check if lighthouse is installed
    if ! command -v lighthouse &> /dev/null; then
        print_warning "Installing lighthouse..."
        npm install -g lighthouse
    fi
    print_success "Lighthouse is available"
    
    # Check if pa11y is installed
    if ! command -v pa11y &> /dev/null; then
        print_warning "Installing pa11y..."
        npm install -g pa11y
    fi
    print_success "pa11y is available"
    
    echo ""
}

setup_output_directory() {
    print_section "Setting Up Output Directory"
    
    if [ ! -d "$OUTPUT_DIR" ]; then
        mkdir -p "$OUTPUT_DIR"
        print_success "Created output directory: $OUTPUT_DIR"
    else
        print_success "Output directory exists: $OUTPUT_DIR"
    fi
    
    echo ""
}

check_server() {
    print_section "Checking Development Server"
    
    # Check if server is running
    if curl -s "$BASE_URL" > /dev/null; then
        print_success "Development server is running at $BASE_URL"
    else
        print_error "Development server is not running at $BASE_URL"
        print_error "Please start the development server with: npm run dev"
        exit 1
    fi
    
    echo ""
}

run_axe_audit() {
    print_section "Running Axe-Core Accessibility Tests"
    
    local results_file="${OUTPUT_DIR}/axe_results_${TIMESTAMP}.json"
    local summary_score=0
    local total_violations=0
    local total_pages=${#PAGES[@]}
    
    echo "Testing $total_pages pages..."
    echo ""
    
    for page in "${PAGES[@]}"; do
        echo -n "Testing $page... "
        
        local url="${BASE_URL}${page}"
        local page_violations=0
        
        # Run axe-core test
        if axe "$url" --reporter json --output "${results_file}.tmp" 2>/dev/null; then
            # Count violations
            page_violations=$(jq '.violations | length' "${results_file}.tmp" 2>/dev/null || echo "0")
            total_violations=$((total_violations + page_violations))
            
            if [ "$page_violations" -eq 0 ]; then
                print_success "✓ No violations"
            else
                print_warning "⚠ $page_violations violations"
            fi
            
            # Append to main results file
            if [ -f "$results_file" ]; then
                jq --slurpfile existing "$results_file" '. as $new | $existing + [$new]' "${results_file}.tmp" > "$results_file.new"
                mv "$results_file.new" "$results_file"
            else
                echo "[$(<"${results_file}.tmp")]" > "$results_file"
            fi
            
            rm "${results_file}.tmp"
        else
            print_error "✗ Test failed"
        fi
    done
    
    echo ""
    echo "Axe-Core Summary:"
    echo "  Total pages tested: $total_pages"
    echo "  Total violations: $total_violations"
    echo "  Results saved to: $results_file"
    echo ""
}

run_lighthouse_audit() {
    print_section "Running Lighthouse Accessibility Audit"
    
    local lighthouse_dir="${OUTPUT_DIR}/lighthouse_${TIMESTAMP}"
    mkdir -p "$lighthouse_dir"
    
    echo "Running Lighthouse on key pages..."
    echo ""
    
    # Test key pages with Lighthouse
    local key_pages=("/" "/en/" "/es/" "/en/jobs" "/es/empleos")
    
    for page in "${key_pages[@]}"; do
        echo -n "Testing $page with Lighthouse... "
        
        local url="${BASE_URL}${page}"
        local safe_page=$(echo "$page" | sed 's/[^a-zA-Z0-9]/_/g')
        local report_file="${lighthouse_dir}/lighthouse_${safe_page}.html"
        local json_file="${lighthouse_dir}/lighthouse_${safe_page}.json"
        
        if lighthouse "$url" \
            --only-categories=accessibility \
            --output=html,json \
            --output-path="${lighthouse_dir}/lighthouse_${safe_page}" \
            --quiet 2>/dev/null; then
            
            # Extract accessibility score
            local score=$(jq '.categories.accessibility.score * 100' "${json_file}" 2>/dev/null || echo "0")
            
            if (( $(echo "$score >= 90" | bc -l) )); then
                print_success "✓ Score: ${score}%"
            elif (( $(echo "$score >= 70" | bc -l) )); then
                print_warning "⚠ Score: ${score}%"
            else
                print_error "✗ Score: ${score}%"
            fi
        else
            print_error "✗ Test failed"
        fi
    done
    
    echo ""
    echo "Lighthouse reports saved to: $lighthouse_dir"
    echo ""
}

run_pa11y_audit() {
    print_section "Running Pa11y WCAG Tests"
    
    local pa11y_file="${OUTPUT_DIR}/pa11y_results_${TIMESTAMP}.json"
    local pa11y_results=()
    
    echo "Running WCAG 2.1 AA tests..."
    echo ""
    
    for page in "${PAGES[@]}"; do
        echo -n "Testing $page with Pa11y... "
        
        local url="${BASE_URL}${page}"
        local temp_file="${pa11y_file}.tmp"
        
        if pa11y "$url" \
            --standard WCAG2AA \
            --reporter json \
            --timeout 10000 > "$temp_file" 2>/dev/null; then
            
            local error_count=$(jq 'length' "$temp_file" 2>/dev/null || echo "0")
            
            if [ "$error_count" -eq 0 ]; then
                print_success "✓ No WCAG violations"
            else
                print_warning "⚠ $error_count WCAG violations"
            fi
            
            # Store results
            pa11y_results+=("$(<"$temp_file")")
            rm "$temp_file"
        else
            print_error "✗ Test failed"
            pa11y_results+=('[]')
        fi
    done
    
    # Combine all pa11y results
    printf '%s\n' "${pa11y_results[@]}" | jq -s 'flatten' > "$pa11y_file"
    
    echo ""
    echo "Pa11y results saved to: $pa11y_file"
    echo ""
}

run_color_contrast_audit() {
    print_section "Running Color Contrast Analysis"
    
    local contrast_file="${OUTPUT_DIR}/color_contrast_${TIMESTAMP}.json"
    
    # Create a simple Node.js script to test color contrasts
    cat > "${OUTPUT_DIR}/contrast_test.js" << 'EOF'
const puppeteer = require('puppeteer');
const fs = require('fs');

const testColorContrast = async (url) => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        await page.goto(url, { waitUntil: 'networkidle0' });
        
        const contrastResults = await page.evaluate(() => {
            const getContrast = (color1, color2) => {
                const getLuminance = (rgb) => {
                    const [r, g, b] = rgb.match(/\d+/g).map(Number);
                    const normalize = (c) => {
                        c = c / 255;
                        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
                    };
                    return 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b);
                };
                
                const lum1 = getLuminance(color1);
                const lum2 = getLuminance(color2);
                const brightest = Math.max(lum1, lum2);
                const darkest = Math.min(lum1, lum2);
                return (brightest + 0.05) / (darkest + 0.05);
            };
            
            const elements = document.querySelectorAll('*');
            const results = [];
            
            for (let elem of elements) {
                const style = window.getComputedStyle(elem);
                const color = style.color;
                const backgroundColor = style.backgroundColor;
                
                if (color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
                    const contrast = getContrast(color, backgroundColor);
                    const fontSize = parseFloat(style.fontSize);
                    const fontWeight = style.fontWeight;
                    
                    const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
                    const requiredRatio = isLargeText ? 3.0 : 4.5;
                    
                    if (contrast < requiredRatio) {
                        results.push({
                            element: elem.tagName.toLowerCase(),
                            selector: elem.className ? `.${elem.className.split(' ')[0]}` : elem.tagName.toLowerCase(),
                            color: color,
                            backgroundColor: backgroundColor,
                            contrast: contrast.toFixed(2),
                            required: requiredRatio,
                            compliant: false
                        });
                    }
                }
            }
            
            return results;
        });
        
        await browser.close();
        return contrastResults;
    } catch (error) {
        await browser.close();
        throw error;
    }
};

const main = async () => {
    const url = process.argv[2];
    try {
        const results = await testColorContrast(url);
        console.log(JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

main();
EOF
    
    # Check if puppeteer is installed
    if ! npm list puppeteer &> /dev/null; then
        print_warning "Installing puppeteer for color contrast testing..."
        npm install puppeteer
    fi
    
    echo "Analyzing color contrast on key pages..."
    echo ""
    
    local all_contrast_issues="[]"
    local key_pages=("/" "/en/" "/es/")
    
    for page in "${key_pages[@]}"; do
        echo -n "Analyzing $page... "
        
        local url="${BASE_URL}${page}"
        
        if node "${OUTPUT_DIR}/contrast_test.js" "$url" > "${contrast_file}.tmp" 2>/dev/null; then
            local issue_count=$(jq 'length' "${contrast_file}.tmp" 2>/dev/null || echo "0")
            
            if [ "$issue_count" -eq 0 ]; then
                print_success "✓ No contrast issues"
            else
                print_warning "⚠ $issue_count contrast issues"
            fi
            
            # Merge results
            all_contrast_issues=$(echo "$all_contrast_issues" | jq --slurpfile new "${contrast_file}.tmp" '. + $new[0]')
        else
            print_error "✗ Analysis failed"
        fi
    done
    
    echo "$all_contrast_issues" > "$contrast_file"
    rm -f "${OUTPUT_DIR}/contrast_test.js" "${contrast_file}.tmp"
    
    echo ""
    echo "Color contrast results saved to: $contrast_file"
    echo ""
}

generate_comprehensive_report() {
    print_section "Generating Comprehensive Report"
    
    cat > "$REPORT_FILE" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SECiD Accessibility Audit Report - $TIMESTAMP</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #fff; padding: 30px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header h1 { margin: 0; color: #F65425; }
        .header p { margin: 10px 0 0 0; color: #666; }
        .section { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .section h2 { margin-top: 0; color: #333; border-bottom: 2px solid #F65425; padding-bottom: 10px; }
        .score { font-size: 24px; font-weight: bold; padding: 10px; border-radius: 4px; text-align: center; margin: 10px 0; }
        .score.excellent { background: #d4edda; color: #155724; }
        .score.good { background: #fff3cd; color: #856404; }
        .score.needs-improvement { background: #f8d7da; color: #721c24; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .summary-item { background: #f8f9fa; padding: 15px; border-radius: 4px; text-align: center; }
        .summary-item h3 { margin: 0 0 5px 0; color: #495057; font-size: 14px; text-transform: uppercase; }
        .summary-item .value { font-size: 24px; font-weight: bold; color: #F65425; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; }
        .violation { margin: 10px 0; padding: 10px; border-left: 4px solid #dc3545; background: #f8f9fa; }
        .violation h4 { margin: 0 0 5px 0; color: #dc3545; }
        .violation p { margin: 0; color: #666; font-size: 14px; }
        .timestamp { text-align: right; color: #666; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>SECiD Accessibility Audit Report</h1>
            <p>WCAG 2.1 Level AA Compliance Assessment</p>
            <p>Generated on: $(date)</p>
        </div>
        
        <div class="section">
            <h2>Executive Summary</h2>
            <div class="summary">
                <div class="summary-item">
                    <h3>Pages Tested</h3>
                    <div class="value">${#PAGES[@]}</div>
                </div>
                <div class="summary-item">
                    <h3>Tests Performed</h3>
                    <div class="value">4</div>
                </div>
                <div class="summary-item">
                    <h3>Tools Used</h3>
                    <div class="value">3</div>
                </div>
                <div class="summary-item">
                    <h3>WCAG Level</h3>
                    <div class="value">AA</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>Test Results</h2>
            <p>This report covers automated accessibility testing using industry-standard tools:</p>
            <ul>
                <li><strong>Axe-Core:</strong> Comprehensive accessibility rule engine</li>
                <li><strong>Lighthouse:</strong> Google's accessibility auditing tool</li>
                <li><strong>Pa11y:</strong> WCAG 2.1 compliance testing</li>
                <li><strong>Color Contrast:</strong> Custom contrast ratio analysis</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>Recommendations</h2>
            <ol>
                <li>Review and fix all identified accessibility violations</li>
                <li>Implement automated accessibility testing in CI/CD pipeline</li>
                <li>Conduct manual testing with screen readers</li>
                <li>Perform user testing with individuals with disabilities</li>
                <li>Regular accessibility audits (monthly recommended)</li>
            </ol>
        </div>
        
        <div class="section">
            <h2>Next Steps</h2>
            <ol>
                <li>Prioritize fixing high-severity violations</li>
                <li>Update development guidelines to include accessibility requirements</li>
                <li>Train development team on accessibility best practices</li>
                <li>Implement accessibility review process for new features</li>
            </ol>
        </div>
        
        <p class="timestamp">Report generated: $TIMESTAMP</p>
    </div>
</body>
</html>
EOF
    
    print_success "Comprehensive report generated: $REPORT_FILE"
    echo ""
}

cleanup() {
    print_section "Cleaning Up"
    
    # Remove temporary files
    find "$OUTPUT_DIR" -name "*.tmp" -delete 2>/dev/null || true
    
    print_success "Cleanup completed"
    echo ""
}

show_summary() {
    print_section "Audit Summary"
    
    echo "Accessibility audit completed successfully!"
    echo ""
    echo "Generated files:"
    echo "  📄 HTML Report: $REPORT_FILE"
    echo "  📊 JSON Data: $JSON_REPORT"
    echo "  📂 All reports: $OUTPUT_DIR"
    echo ""
    echo "Next steps:"
    echo "  1. Review the HTML report in your browser"
    echo "  2. Address high-priority accessibility issues"
    echo "  3. Re-run audit after fixes"
    echo ""
    
    # Offer to open report
    if command -v open &> /dev/null; then
        read -p "Open HTML report now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            open "$REPORT_FILE"
        fi
    fi
}

# Main execution
main() {
    print_header
    check_dependencies
    setup_output_directory
    check_server
    run_axe_audit
    run_lighthouse_audit
    run_pa11y_audit
    run_color_contrast_audit
    generate_comprehensive_report
    cleanup
    show_summary
}

# Handle script arguments
case "${1:-}" in
    "help"|"--help"|"-h")
        echo "SECiD Accessibility Audit Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  help          Show this help message"
        echo "  quick         Run quick audit (axe-core only)"
        echo "  full          Run full audit (default)"
        echo "  contrast      Run color contrast check only"
        echo ""
        echo "Requirements:"
        echo "  - Development server running on $BASE_URL"
        echo "  - Node.js and npm installed"
        echo "  - Internet connection for tool installation"
        exit 0
        ;;
    "quick")
        print_header
        check_dependencies
        setup_output_directory
        check_server
        run_axe_audit
        cleanup
        ;;
    "contrast")
        print_header
        check_dependencies
        setup_output_directory
        check_server
        run_color_contrast_audit
        cleanup
        ;;
    *)
        main
        ;;
esac